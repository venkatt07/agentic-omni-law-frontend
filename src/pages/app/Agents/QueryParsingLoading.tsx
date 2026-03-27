import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ErrorState } from "@/components/app/PageState";
import type { RunLogLine } from "@/components/app/run-console/useRunState";
import AgentProcessingScreen from "@/components/app/AgentProcessingScreen";
import { caseService, type QueryParseFilters } from "@/services/caseService";
import type { RunStatusResponse } from "@/services/runService";
import { useAppStore } from "@/store";
import { clearLoadingIntent, getLoadingIntent, isFreshLoadingIntent } from "@/lib/loadingIntent";
import { saveQueryParseTranscript } from "@/lib/queryParseTranscript";
import { saveRuntimeActivity } from "@/lib/runtimeActivityStore";

const FILTERS_SESSION_KEY = "query_parse_filters_v1";
const QUERY_LOADING_DRAFT_PREFIX = "query_parse_loading_draft:";
const STATUS_POLL_DELAY_MS = 450;
const MAX_STATUS_POLLS = 2400;
const COMPLETION_SETTLE_DELAY_MS = 2200;
const CATCH_UP_ACTIVITY_GAP_MS = 1150;

const QUERY_RUNTIME_PHASES = [
  {
    key: "accepted",
    label: "Accepting query into runtime",
    phase: "Starting",
    text: "Run accepted and starting",
    detail: "The workspace, user input, and active filters are locked for this run.",
    next: "Prepare the case context.",
    progress: 8,
  },
  {
    key: "prepare_context",
    label: "Preparing case context",
    phase: "Reading workspace",
    text: "Preparing query and workspace context",
    detail: "Collecting the submitted query, uploaded documents, and workspace evidence for parsing.",
    next: "Extract facts, parties, and requested relief.",
    progress: 22,
  },
  {
    key: "extract_facts",
    label: "Extracting facts and parties",
    phase: "Thinking",
    text: "Extracting facts, parties, and requested relief",
    detail: "Separating chronology, parties, obligations, and missing factual details from the matter.",
    next: "Classify legal domain and jurisdiction.",
    progress: 42,
  },
  {
    key: "classify_issues",
    label: "Classifying domain and jurisdiction",
    phase: "Thinking",
    text: "Classifying legal domain and jurisdiction",
    detail: "Resolving language, legal domain, and forum signals before the response is structured.",
    next: "Retrieve legal signals and authority hints.",
    progress: 62,
  },
  {
    key: "retrieve_signals",
    label: "Retrieving legal signals",
    phase: "Reading documents",
    text: "Retrieving legal signals and source hints",
    detail: "Cross-checking the matter against workspace evidence and the selected legal source scope.",
    next: "Compose the structured response.",
    progress: 78,
  },
  {
    key: "compose_output",
    label: "Composing structured output",
    phase: "Reasoning",
    text: "Composing the structured Query Parsing output",
    detail: "Shaping the summary, issue groups, grounds, citations, and authority hints for downstream use.",
    next: "Validate and save the result.",
    progress: 92,
  },
  {
    key: "completed",
    label: "Query Parsing completed",
    phase: "Done",
    text: "Saved structured output to the workspace",
    detail: "The parsed result is validated and stored for the next agent stage.",
    next: "Open the Query Parsing result.",
    progress: 100,
  },
] as const;

function isCaseNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /case not found/i.test(message);
}

function inferDomainPreview(query: string, filters: QueryParseFilters) {
  if (filters.legalDomain && filters.legalDomain !== "All Domains") return filters.legalDomain;
  const q = query.toLowerCase();
  const checks: Array<[string, string[]]> = [
    ["Corporate / Contract", ["contract", "agreement", "breach", "vendor", "supplier", "payment", "termination"]],
    ["Employment", ["employment", "employee", "salary", "harassment", "termination"]],
    ["IP Law", ["trademark", "copyright", "patent", "infringement", "license"]],
    ["Property / Tenancy", ["tenant", "lease", "rent", "landlord", "property"]],
    ["Consumer / Service Dispute", ["consumer", "refund", "defect", "service"]],
  ];
  let best = "Civil Litigation";
  let bestScore = 0;
  for (const [domain, terms] of checks) {
    const score = terms.reduce((acc, term) => acc + (q.includes(term) ? 1 : 0), 0);
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  return best;
}

function detectLanguagePreview(query: string) {
  const sample = (query || "").trim();
  if (!sample) return null;
  let devanagari = 0;
  let tamil = 0;
  let telugu = 0;
  let bengali = 0;
  let latin = 0;
  for (const ch of sample.slice(0, 4000)) {
    const c = ch.charCodeAt(0);
    if (c >= 0x0900 && c <= 0x097f) devanagari += 1;
    else if (c >= 0x0b80 && c <= 0x0bff) tamil += 1;
    else if (c >= 0x0c00 && c <= 0x0c7f) telugu += 1;
    else if (c >= 0x0980 && c <= 0x09ff) bengali += 1;
    else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) latin += 1;
  }
  const buckets = [
    { code: "hi", label: "Hindi", count: devanagari },
    { code: "ta", label: "Tamil", count: tamil },
    { code: "te", label: "Telugu", count: telugu },
    { code: "bn", label: "Bengali", count: bengali },
    { code: "en", label: "English", count: latin },
  ].sort((a, b) => b.count - a.count);
  if (!buckets[0].count) return null;
  const total = buckets.reduce((acc, bucket) => acc + bucket.count, 0);
  const confidence = Math.min(0.99, Math.max(buckets[0].code === "en" ? 0.7 : 0.85, total ? buckets[0].count / total : 0));
  return {
    label: buckets[0].label,
    confidence,
  };
}

function isLikelyNonCaseInput(text: string) {
  const q = String(text || "").trim();
  if (!q) return false;
  const normalized = q.toLowerCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const legalHints = [
    "case", "court", "judge", "petition", "plaintiff", "defendant", "notice", "injunction",
    "contract", "agreement", "breach", "dispute", "legal", "law", "complaint", "harassment",
    "property", "tenant", "landlord", "consumer", "refund", "arbitration", "payment",
    "invoice", "termination", "employment", "salary", "fir", "police",
  ];
  const legalHitCount = legalHints.reduce((acc, term) => acc + (normalized.includes(term) ? 1 : 0), 0);
  if (legalHitCount > 0) return false;
  const compact = normalized.replace(/\s+/g, "");
  const tooShort = tokens.length < 4 || compact.length < 24;
  const randomRun = /(.)\1{4,}/.test(compact);
  return tooShort || randomRun;
}

function isRejectedQueryParseResult(parse: any) {
  const parserPath = String(parse?.qaDebug?.parser_path || "").trim();
  const rejectedFlag = parse?.rejectedInput === true;
  const outputRejected = String(parse?.outputMode || "").toLowerCase() === "rejected_input";
  const invalidRejected = parse?.analysisValid === false && (rejectedFlag || outputRejected);
  const guardRejected = new Set([
    "deterministic_low_signal_query_guard",
    "deterministic_short_input_guard",
    "deterministic_missing_input_guard",
    "deterministic_non_legal_input_guard",
    "deterministic_mixed_case_bundle_guard",
    "deterministic_prompt_template_guard",
  ]).has(parserPath);
  const summary = String(parse?.summary || parse?.executiveSummaryText || "").trim().toLowerCase();
  const summaryRejected =
    summary.startsWith("rejected non-case input") ||
    summary.startsWith("rejected prompt-template input") ||
    summary.startsWith("rejected non-case input due to insufficient facts");
  return rejectedFlag || outputRejected || invalidRejected || guardRejected || summaryRejected;
}

function readPreviewParams(params: URLSearchParams) {
  const label = params.get("previewLang");
  const confidenceRaw = params.get("previewLangConf");
  const domain = params.get("previewDomain");
  const confidence = confidenceRaw != null ? Number(confidenceRaw) : undefined;
  return {
    language: label
      ? {
          label,
          confidence: typeof confidence === "number" && Number.isFinite(confidence) ? confidence : undefined,
        }
      : null,
    domain: domain || null,
  };
}

function loadFilters(): QueryParseFilters {
  const fallback = {
    jurisdiction: "All India",
    legalDomain: "All Domains",
    dateRange: "Last 12 months",
    sourceTypes: ["Acts & Statutes", "Case Laws", "Regulations", "Legal Opinions"],
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(FILTERS_SESSION_KEY);
    if (!raw) throw new Error("missing");
    return JSON.parse(raw) as QueryParseFilters;
  } catch {
    return fallback;
  }
}

function formatActivityTimestamp(timestampMs: number) {
  return new Date(timestampMs).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function parseStartedAtMs(status: RunStatusResponse | null) {
  if (!status?.started_at) return NaN;
  const parsed = Date.parse(String(status.started_at));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function deriveRuntimePhaseIndex(status: RunStatusResponse | null, startedAtMs: number | null, nowMs: number) {
  if (!status) return 0;
  if (status.status === "SUCCEEDED") return QUERY_RUNTIME_PHASES.length - 1;
  if (status.status === "FAILED") return Math.max(1, QUERY_RUNTIME_PHASES.length - 2);

  const elapsedSec = startedAtMs != null ? Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)) : 0;
  const pct = Number(status.progress?.pct || 0);
  const fromTime =
    elapsedSec >= 12 ? 5 :
    elapsedSec >= 9 ? 4 :
    elapsedSec >= 6 ? 3 :
    elapsedSec >= 3 ? 2 :
    elapsedSec >= 1 ? 1 : 0;
  const fromPct =
    pct >= 85 ? 5 :
    pct >= 70 ? 4 :
    pct >= 55 ? 3 :
    pct >= 35 ? 2 :
    pct >= 15 ? 1 : 0;

  return Math.max(status.status === "RUNNING" ? 1 : 0, Math.max(fromTime, fromPct));
}

function estimateOverallPct(status: RunStatusResponse | null, phaseIndex: number, startedAtMs: number | null, nowMs: number) {
  if (status?.status === "SUCCEEDED" || status?.status === "FAILED") return 100;
  const elapsedSec = startedAtMs != null ? Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)) : 0;
  const phaseBase = QUERY_RUNTIME_PHASES[Math.min(phaseIndex, QUERY_RUNTIME_PHASES.length - 1)]?.progress ?? 8;
  const projected = Math.min(96, phaseBase + Math.min(10, (elapsedSec % 3) * 3));
  return Math.max(Number(status?.progress?.pct || 0), projected);
}

function buildRuntimeSteps(phaseIndex: number, status: RunStatusResponse | null, errorMessage: string | null) {
  const visiblePhases = QUERY_RUNTIME_PHASES.slice(1, 6);
  const activeStepIndex = Math.max(0, Math.min(visiblePhases.length - 1, phaseIndex - 1));

  return visiblePhases.map((phase, idx) => {
    const isFailure = status?.status === "FAILED" && idx === activeStepIndex;
    const isDone = status?.status === "SUCCEEDED" || idx < activeStepIndex;
    const isRunning = !isFailure && status?.status !== "SUCCEEDED" && idx === activeStepIndex;
    return {
      key: phase.key,
      label: phase.label,
      detail: isFailure && errorMessage ? errorMessage : phase.detail,
      state: isFailure ? "FAILED" : isDone ? "SUCCEEDED" : isRunning ? "RUNNING" : "PENDING",
      pct: isDone ? 100 : isRunning ? phase.progress : 0,
    };
  });
}

function buildActivityEntry(
  phaseIndex: number,
  timestamp: string | undefined,
  context: {
    predictedDomain: string | null;
    predictedLanguage: { label: string; confidence?: number } | null;
    filters: QueryParseFilters;
    query: string;
    runId: string;
  },
  state: NonNullable<RunLogLine["state"]>,
  overrides?: Partial<RunLogLine>,
): RunLogLine {
  const phase = QUERY_RUNTIME_PHASES[phaseIndex];
  const isActive = state === "active";
  const isErrored = state === "error";
  const phaseLabel = phase.key === "accepted" && phaseIndex === 0 ? "Starting" : phase.phase;
  const queryMode = context.query.trim().length > 0 ? "direct query" : "workspace documents";
  const scopedSources = context.filters.sourceTypes.join(", ");
  const detailByPhase: Record<string, string> = {
    accepted: `The run is starting from ${queryMode} with ${context.filters.jurisdiction} and ${scopedSources}.`,
    prepare_context: `Collecting active case context from ${queryMode} before the parser begins.`,
    extract_facts: "Separating parties, dates, obligations, requested relief, and missing details from the submitted matter.",
    classify_issues: `Current signals point to ${context.predictedDomain || "a general legal dispute"}${context.predictedLanguage?.label ? ` in ${context.predictedLanguage.label}` : ""}.`,
    retrieve_signals: `Scanning the selected source scope: ${scopedSources}.`,
    compose_output: "Packaging the parsed summary, issue groups, legal grounds, and authority hints for the workspace.",
    completed: `Run ${context.runId} finished and the structured output is ready for review.`,
  };
  const text = overrides?.text || phase.text;
  const detail = overrides?.detail || detailByPhase[phase.key] || phase.detail;
  const next =
    overrides?.next !== undefined
      ? overrides.next
      : phase.next;

  return {
    id: overrides?.id || `${context.runId}:${phase.key}`,
    timestamp,
    actor: "Query Parsing",
    phase: phaseLabel,
    text,
    detail,
    next,
    state,
    tone: isErrored ? "error" : isActive ? "live" : "success",
    ...overrides,
  };
}

export default function QueryParsingLoading() {
  const [location, setLocation] = useLocation();
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState("");
  const [runStatus, setRunStatus] = useState<RunStatusResponse | null>(null);
  const [runStartedAtMs, setRunStartedAtMs] = useState<number | null>(null);
  const [resolvedCaseId, setResolvedCaseId] = useState("");
  const [displayPct, setDisplayPct] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activityLines, setActivityLines] = useState<RunLogLine[]>([]);
  const activityLinesRef = useRef<RunLogLine[]>([]);

  const params = useMemo(() => {
    const search =
      typeof window !== "undefined"
        ? window.location.search
        : location.includes("?")
          ? `?${location.split("?")[1] ?? ""}`
          : "";
    return new URLSearchParams(search);
  }, [location]);

  const caseId = params.get("caseId") || "";
  const draftKey = params.get("draftKey") || "";
  const routeRunId = params.get("runId") || "";
  const routeQueryParam = params.get("query") || "";
  const attachedDocsParam = params.get("attachedDocs") || "";
  const routeDraft = useMemo(() => {
    if (typeof window === "undefined" || !draftKey) return null;
    try {
      const raw = sessionStorage.getItem(`${QUERY_LOADING_DRAFT_PREFIX}${draftKey}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { query?: string; attachedDocs?: string[] };
      return {
        query: String(parsed.query || ""),
        attachedDocs: Array.isArray(parsed.attachedDocs)
          ? parsed.attachedDocs.map((value) => String(value || "").trim()).filter(Boolean)
          : [],
      };
    } catch {
      return null;
    }
  }, [draftKey]);
  const loadingIntent = useMemo(() => getLoadingIntent(), [location]);

  const query = routeDraft?.query || routeQueryParam;
  const filters = useMemo(() => loadFilters(), []);
  const routePreview = useMemo(() => readPreviewParams(params), [params]);
  const hideDomainForNonCase = useMemo(() => isLikelyNonCaseInput(query), [query]);
  const predictedDomain = useMemo(
    () => (hideDomainForNonCase ? null : (routePreview.domain || inferDomainPreview(query, filters))),
    [filters, hideDomainForNonCase, query, routePreview.domain],
  );
  const predictedLanguage = useMemo(
    () => routePreview.language || detectLanguagePreview(query),
    [query, routePreview.language],
  );
  const activityContext = useMemo(
    () => ({
      predictedDomain,
      predictedLanguage,
      filters,
      query,
      runId,
    }),
    [filters, predictedDomain, predictedLanguage, query, runId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const actualStartedAtMs = useMemo(() => {
    const parsed = parseStartedAtMs(runStatus);
    return Number.isFinite(parsed) ? parsed : runStartedAtMs;
  }, [runStartedAtMs, runStatus]);
  const activePhaseIndex = useMemo(
    () => deriveRuntimePhaseIndex(runStatus, actualStartedAtMs, nowMs),
    [actualStartedAtMs, nowMs, runStatus],
  );
  const currentPhase = QUERY_RUNTIME_PHASES[Math.min(activePhaseIndex, QUERY_RUNTIME_PHASES.length - 1)];
  const liveSteps = useMemo(
    () => buildRuntimeSteps(activePhaseIndex, runStatus, error),
    [activePhaseIndex, error, runStatus],
  );
  const completedCount = liveSteps.filter((step) => step.state === "SUCCEEDED").length;
  const overallPct = useMemo(
    () => estimateOverallPct(runStatus, activePhaseIndex, actualStartedAtMs, nowMs),
    [activePhaseIndex, actualStartedAtMs, nowMs, runStatus],
  );
  useEffect(() => {
    setDisplayPct((prev) => Math.max(prev, overallPct));
  }, [overallPct]);

  useEffect(() => {
    if (!runId) {
      setDisplayPct(0);
      setActivityLines([]);
    }
  }, [runId]);

  useEffect(() => {
    activityLinesRef.current = activityLines;
  }, [activityLines]);

  useEffect(() => {
    const targetCaseId = String(resolvedCaseId || caseId || "").trim();
    if (!targetCaseId || !runId || !activityLines.length) return;
    saveRuntimeActivity({
      caseId: targetCaseId,
      stage: "query_parsing",
      runId,
      lines: activityLines,
    });
  }, [activityLines, caseId, resolvedCaseId, runId]);

  useEffect(() => {
    if (!runId) return;

    const failed = runStatus?.status === "FAILED";
    const succeeded = runStatus?.status === "SUCCEEDED";
    const targetIndex = Math.max(0, Math.min(QUERY_RUNTIME_PHASES.length - 1, activePhaseIndex));

    setActivityLines((previous) => {
      const nextLines = previous
        .filter((line) => line.id.startsWith(`${runId}:`))
        .map((line) => ({ ...line }));
      const lineMap = new Map(nextLines.map((line) => [line.id, line]));
      const missingIndexes = Array.from({ length: targetIndex + 1 }, (_, phaseIndex) => phaseIndex).filter((phaseIndex) => {
        const lineId = `${runId}:${QUERY_RUNTIME_PHASES[phaseIndex].key}`;
        return !lineMap.has(lineId);
      });
      const appendBaseMs = Date.now() - Math.max(0, missingIndexes.length - 1) * CATCH_UP_ACTIVITY_GAP_MS;
      let appendOffset = 0;

      for (let phaseIndex = 0; phaseIndex <= targetIndex; phaseIndex += 1) {
        const phaseKey = QUERY_RUNTIME_PHASES[phaseIndex].key;
        const lineId = `${runId}:${phaseKey}`;
        const existing = lineMap.get(lineId);
        const timestamp =
          existing?.timestamp ||
          formatActivityTimestamp(appendBaseMs + appendOffset++ * CATCH_UP_ACTIVITY_GAP_MS);
        let state: NonNullable<RunLogLine["state"]>;
        if (failed) {
          state = phaseIndex < targetIndex ? "completed" : "error";
        } else if (succeeded) {
          state = phaseIndex < targetIndex ? "completed" : "active";
        } else {
          state = phaseIndex < targetIndex ? "completed" : "active";
        }

        const entry = state === "error"
          ? buildActivityEntry(
              phaseIndex,
              timestamp,
              activityContext,
              state,
              {
                text: "Query Parsing run failed",
                detail: String(runStatus?.error_message || runStatus?.error || error || "The runtime stopped before producing output."),
                next: "Retry the run from the same workspace context.",
              },
            )
          : buildActivityEntry(phaseIndex, timestamp, activityContext, state);
        lineMap.set(lineId, entry);
      }

      return Array.from({ length: targetIndex + 1 }, (_, phaseIndex) => {
        const lineId = `${runId}:${QUERY_RUNTIME_PHASES[phaseIndex].key}`;
        return lineMap.get(lineId)!;
      });
    });
  }, [activePhaseIndex, activityContext, error, runId, runStatus]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setError(null);
        setRunId(routeRunId);
        setRunStatus(null);
        setRunStartedAtMs(null);
        setResolvedCaseId("");

        if (isFreshLoadingIntent(loadingIntent) && loadingIntent?.type === "run_all") {
          clearLoadingIntent({ type: "run_all", caseId: loadingIntent.caseId, draftKey: loadingIntent.draftKey });
        }

        let effectiveCaseId = caseId || await caseService.ensureCase("Query Parsing Workspace");
        if (cancelled) return;
        setResolvedCaseId(effectiveCaseId);
        if (effectiveCaseId !== caseId) {
          const fallbackTitle = `Case ${effectiveCaseId}`;
          setCaseWorkspace(effectiveCaseId, fallbackTitle);
        }

        const expectedAttachments = routeDraft?.attachedDocs || [];
        if (expectedAttachments.length > 0) {
          for (let i = 0; i < 3; i += 1) {
            await caseService.fetchCase(effectiveCaseId).catch(() => null as never);
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }

        let activeRunId = routeRunId;
        if (!activeRunId) {
          let started;
          try {
            started = await caseService.startQueryParseRun(effectiveCaseId, query.trim().length > 0 ? query : "", filters);
          } catch (startError) {
            if (!isCaseNotFoundError(startError)) throw startError;
            effectiveCaseId = await caseService.ensureCase("Query Parsing Workspace");
            setResolvedCaseId(effectiveCaseId);
            setCaseWorkspace(effectiveCaseId, `Case ${effectiveCaseId}`);
            started = await caseService.startQueryParseRun(effectiveCaseId, query.trim().length > 0 ? query : "", filters);
          }
          activeRunId = started.run_id;
          if (typeof window !== "undefined") {
            const nextParams = new URLSearchParams(window.location.search);
            nextParams.set("caseId", effectiveCaseId);
            if (draftKey) nextParams.set("draftKey", draftKey);
            nextParams.set("runId", activeRunId);
            window.history.replaceState({}, "", `${window.location.pathname}?${nextParams.toString()}`);
          }
          setRunId(activeRunId);
        } else {
          setRunId(activeRunId);
        }
        if (cancelled) return;

        let localStartedAtMs = Date.now();
        setRunStartedAtMs(localStartedAtMs);

        let latestStatus: RunStatusResponse | null = null;
        for (let attempt = 0; attempt < MAX_STATUS_POLLS; attempt += 1) {
          latestStatus = await caseService.getRunStatus(activeRunId);
          if (cancelled) return;

          const parsedStartedAtMs = parseStartedAtMs(latestStatus);
          if (Number.isFinite(parsedStartedAtMs)) {
            localStartedAtMs = parsedStartedAtMs;
            setRunStartedAtMs(parsedStartedAtMs);
          }

          setRunStatus(latestStatus);

          if (latestStatus.status === "SUCCEEDED") {
            break;
          }

          if (latestStatus.status === "FAILED") {
            throw new Error(latestStatus.error_message || latestStatus.error || "Query parsing failed.");
          }

          await new Promise((resolve) => setTimeout(resolve, STATUS_POLL_DELAY_MS));
        }

        if (!latestStatus || latestStatus.status !== "SUCCEEDED") {
          setRunStatus((prev) => prev ? ({
            ...prev,
            progress: {
              ...(prev.progress || {}),
              step: "Still processing the workspace. Waiting for the final Query Parsing output.",
              pct: Math.max(96, Number(prev.progress?.pct || 0)),
            },
          }) : prev);
          while (!cancelled) {
            latestStatus = await caseService.getRunStatus(activeRunId);
            if (cancelled) return;
            setRunStatus(latestStatus);
            if (latestStatus.status === "SUCCEEDED") break;
            if (latestStatus.status === "FAILED") {
              throw new Error(latestStatus.error_message || latestStatus.error || "Query parsing failed.");
            }
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
        }

        await caseService.refreshCaseIntoStore(effectiveCaseId);
        const parse = useAppStore.getState().casesById[effectiveCaseId]?.outputs?.query_parse;
        if (!parse && typeof window !== "undefined") {
          const nextParams = new URLSearchParams();
          nextParams.set("caseId", effectiveCaseId);
          if (attachedDocsParam) nextParams.set("attachedDocs", attachedDocsParam);
          if (activeRunId) nextParams.set("runId", activeRunId);
          nextParams.set("inputMode", query.trim().length > 0 ? "query" : (attachedDocsParam ? "docs" : "auto"));
          setLocation(`/app/agents/query/result?${nextParams.toString()}`, { replace: true } as never);
          clearLoadingIntent({ type: "query_parsing", draftKey });
          return;
        }
        if (!parse) {
          throw new Error("Query parsing output is unavailable after the run completed.");
        }

        if (isRejectedQueryParseResult(parse)) {
          setError(
            "Input does not appear to be a valid legal/judicial case. Please provide a real dispute/case description or upload relevant legal case documents.",
          );
          return;
        }

        await caseService.listCases().then((rows) => {
          const row = rows.find((item) => item.case_id === effectiveCaseId);
          if (row) setCaseWorkspace(effectiveCaseId, row.title);
        }).catch(() => undefined);

        if (cancelled) return;
        await new Promise((resolve) => setTimeout(resolve, COMPLETION_SETTLE_DELAY_MS));

        const attachedDocsForRoute = routeDraft?.attachedDocs?.length
          ? JSON.stringify(routeDraft.attachedDocs)
          : attachedDocsParam;
        const runIdForRoute = activeRunId || parse.provenance?.run_id || (parse as any)?.runId || "";
        const inputModeForRoute = query.trim().length > 0 ? "query" : (attachedDocsForRoute ? "docs" : "auto");

        if (typeof window !== "undefined" && localStartedAtMs != null) {
          localStorage.setItem(`query_parse_last_run_ms:${effectiveCaseId}`, String(Math.max(0, Date.now() - localStartedAtMs)));
        }
        saveQueryParseTranscript(
          effectiveCaseId,
          runIdForRoute || activeRunId,
          activityLinesRef.current.map((line) => ({
            ...line,
            state: line.state === "error" ? "error" : "completed",
            tone: line.tone === "error" ? "error" : "success",
          })),
        );
        saveRuntimeActivity({
          caseId: effectiveCaseId,
          stage: "query_parsing",
          runId: runIdForRoute || activeRunId,
          lines: activityLinesRef.current.map((line) => ({
            ...line,
            state: line.state === "error" ? "error" : "completed",
            tone: line.tone === "error" ? "error" : "success",
          })),
        });

        setLocation(
          `/app/agents/query/result?caseId=${encodeURIComponent(effectiveCaseId)}${
            attachedDocsForRoute ? `&attachedDocs=${encodeURIComponent(attachedDocsForRoute)}` : ""
          }${runIdForRoute ? `&runId=${encodeURIComponent(runIdForRoute)}` : ""}${
            inputModeForRoute ? `&inputMode=${encodeURIComponent(inputModeForRoute)}` : ""
          }`,
          { replace: true } as never,
        );
        clearLoadingIntent({ type: "query_parsing", draftKey });

        if (typeof window !== "undefined" && draftKey) {
          sessionStorage.removeItem(`${QUERY_LOADING_DRAFT_PREFIX}${draftKey}`);
        }
      } catch (nextError) {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "Query parsing failed.");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [attachedDocsParam, caseId, draftKey, filters, loadingIntent, predictedDomain, predictedLanguage, query, routeDraft, routeRunId, setCaseWorkspace, setLocation]);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <ErrorState
          title="Query parsing failed"
          description={error}
          actionLabel="Back to Query Parsing"
          onAction={() => {
            clearLoadingIntent({ type: "query_parsing", draftKey });
            setLocation("/app/agents/query", { replace: true } as never);
          }}
        />
      </div>
    );
  }

  return (
    <AgentProcessingScreen
      runType="single_agent"
      eyebrow="Query Parsing"
      title="Query Parsing"
      subtitle="Parsing the case, validating language and jurisdiction, and preparing structured context for downstream agents."
      statusLabel={currentPhase?.label || "Query Parsing"}
      statusDetail={currentPhase?.detail || "Query Parsing is preparing the structured case context."}
      startedAtMs={actualStartedAtMs ?? undefined}
      progressPct={displayPct}
      steps={liveSteps}
      metrics={[
        { label: "Progress", value: `${completedCount}/${liveSteps.length}`, hint: "steps complete" },
        { label: "Coverage", value: `${Math.max(1, overallPct)}%`, hint: "overall run" },
        {
          label: "Language",
          value: predictedLanguage
            ? `${predictedLanguage.label}${typeof predictedLanguage.confidence === "number" ? ` ${Math.round(predictedLanguage.confidence * 100)}%` : ""}`
            : "Detecting",
          hint: "inference",
        },
        { label: "Jurisdiction", value: filters.jurisdiction, hint: "active filter" },
      ]}
      metaItems={[
        ...(predictedDomain ? [{ label: "Detected domain", value: predictedDomain }] : []),
        { label: "Search scope", value: filters.sourceTypes.join(", ") },
        { label: "Input mode", value: query.trim().length > 0 ? "Direct query" : "Workspace documents" },
        ...(resolvedCaseId ? [{ label: "Workspace", value: resolvedCaseId.slice(0, 8) }] : []),
        ...(runId ? [{ label: "Run ID", value: runId }] : []),
      ]}
      activityLines={activityLines}
      footerNote="Acts, case law, regulations, and legal opinions are filtered before synthesis."
    />
  );
}

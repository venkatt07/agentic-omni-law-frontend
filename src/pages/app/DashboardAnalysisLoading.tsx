import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ErrorState } from "@/components/app/PageState";
import { useI18n } from "@/hooks/useI18n";
import { autoTranslateUiText } from "@/lib/i18n";
import { caseService, type QueryParseFilters } from "@/services/caseService";
import { useAppStore } from "@/store";
import { getRoleAgentsForRole, roleAgentRegistry } from "@/agents/roleAgentRegistry";
import AgentProcessingScreen from "@/components/app/AgentProcessingScreen";
import { Button } from "@/components/ui/button";
import type { RunLogLine } from "@/components/app/run-console/useRunState";
import { clearLoadingIntent, getLoadingIntent, isFreshLoadingIntent } from "@/lib/loadingIntent";

const FILTERS_SESSION_KEY = "query_parse_filters_v1";
const DASHBOARD_RUN_DRAFT_PREFIX = "dashboard_run_loading_draft:";
const DASHBOARD_RUN_STARTED_AT_PREFIX = "dashboard_run_started_at:";
const COMMON_AGENT_ORDER = [
  "query_parsing",
  "contract_risk_dispute_settlement",
  "case_outcome_deadline_penalty",
  "policy_compliance",
  "legal_drafts_validation",
] as const;

const AGENT_LABELS: Record<string, string> = {
  query_parsing: "Query Parsing",
  contract_risk_dispute_settlement: "Contract Risk",
  case_outcome_deadline_penalty: "Outcome Prediction",
  policy_compliance: "Policy Compliance",
  legal_drafts_validation: "Legal Drafts",
  lawyer_strategy_action_plan: "Strategy & Action Planning",
  lawyer_client_communication: "Client Communication",
  lawyer_court_process_copilot: "Court Process Co-pilot",
  lawyer_case_prep: "Case Preparation",
  lawyer_intern_guidance: "Intern Guidance",
  student_workflow_case_mgmt: "Workflow & Case Management",
  student_concept_learning_books: "Concept Learning",
  student_exam_preparation: "Exam Preparation",
  corp_executive_decision_support: "Executive Decision Support",
  corp_workflow_case_prep: "Workflow & Case Preparation",
  corp_court_process: "Court Process Co-pilot",
  individual_step_by_step_guidance: "Step-by-step Legal Guidance",
  individual_family_explain: "Family Connect & Explain",
  individual_cost_factor: "Cost Factor",
};

function getPayloadForAgent(agentKey: string, outputs: Record<string, any>) {
  if (outputs[agentKey]) return outputs[agentKey];
  if (agentKey === "query_parsing") return outputs.query_parsing || outputs.query_parse || null;
  if (agentKey === "contract_risk_dispute_settlement") return outputs.contract_risk_dispute_settlement || outputs.contract_risk || null;
  if (agentKey === "case_outcome_deadline_penalty") return outputs.case_outcome_deadline_penalty || outputs.outcome_projection || null;
  if (agentKey === "policy_compliance") return outputs.policy_compliance || null;
  if (agentKey === "legal_drafts_validation") return outputs.legal_drafts_validation || outputs.legal_drafts || null;
  return null;
}

function hasSavedPayload(payload: any) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.stage === "running") return false;
  if (Array.isArray(payload.sections) && payload.sections.length > 0) return true;
  const keys = Object.keys(payload);
  if (!keys.length) return false;
  return keys.some((key) => payload[key] != null && payload[key] !== "");
}

function isTerminalAgentState(status: string) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "done" || normalized === "error" || normalized === "failed" || normalized === "cancelled" || normalized === "blocked";
}

function areAllAgentResultsReady(
  agents: Record<string, { status: string; pct?: number; step?: string; reason?: string }>,
  outputs: Record<string, any>,
  expectedOrder: string[],
) {
  const keys = expectedOrder.filter((key) => agents[key]);
  if (!keys.length) return false;
  return keys.every((key) => {
    const row = agents[key];
    const status = String(row?.status || "").toLowerCase();
    if (!isTerminalAgentState(status)) return false;
    if (status === "done") return hasSavedPayload(getPayloadForAgent(key, outputs || {}));
    return Boolean(String(row?.reason || row?.step || "").trim()) || hasSavedPayload(getPayloadForAgent(key, outputs || {}));
  });
}

function countReadyAgentResults(
  agents: Record<string, { status: string; pct?: number; step?: string; reason?: string }>,
  outputs: Record<string, any>,
  expectedOrder: string[],
) {
  const keys = expectedOrder.filter((key) => agents[key]);
  return keys.reduce((count, key) => {
    const row = agents[key];
    const status = String(row?.status || "").toLowerCase();
    if (!isTerminalAgentState(status)) return count;
    if (status === "done") {
      return hasSavedPayload(getPayloadForAgent(key, outputs || {})) ? count + 1 : count;
    }
    return Boolean(String(row?.reason || row?.step || "").trim()) || hasSavedPayload(getPayloadForAgent(key, outputs || {}))
      ? count + 1
      : count;
  }, 0);
}

function computePipelineDisplayPct(
  items: Array<{ state: string; pct?: number }>,
  elapsedSec: number,
  allReady: boolean,
) {
  if (!items.length) return 0;
  if (allReady) return 100;
  const normalized = items.map((item) => ({
    state: String(item.state || "queued").toLowerCase(),
    pct: Number(item.pct || 0),
  }));
  const completed = normalized.filter((item) => item.state === "done" || item.state === "error" || item.state === "failed" || item.state === "cancelled" || item.state === "blocked").length;
  const running = normalized.find((item) => item.state === "running");
  const queuedCount = normalized.filter((item) => item.state === "queued").length;
  const activePct = running ? Math.max(running.pct, Math.min(96, 18 + elapsedSec * 0.7)) : 0;
  const stageProgress = ((completed + (running ? activePct / 100 : 0)) / normalized.length) * 100;
  const timeCurve = elapsedSec < 20
    ? 8 + elapsedSec * 0.9
    : elapsedSec < 60
      ? 26 + (elapsedSec - 20) * 0.65
      : elapsedSec < 120
        ? 52 + (elapsedSec - 60) * 0.35
        : 73 + Math.min(22, (elapsedSec - 120) * 0.14);
  const blended = Math.max(stageProgress, timeCurve);
  if (!running && queuedCount > 0) {
    return Math.max(6, Math.min(88, Math.round(Math.max(stageProgress, Math.min(timeCurve, 88)))));
  }
  return Math.max(6, Math.min(99, Math.round(blended)));
}

function isCaseNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /case not found/i.test(message);
}

function buildSyntheticActivity(
  agents: Record<string, { status: string; pct?: number; step?: string; reason?: string }>,
  now: number,
  expectedOrder: string[],
): RunLogLine[] {
  const rows = expectedOrder
    .map((key) => {
      const value = agents[key] || { status: "queued" };
      return {
        key,
        status: String(value?.status || "").toLowerCase(),
        step: String(value?.step || value?.reason || "").trim(),
        label: AGENT_LABELS[key] || key.replaceAll("_", " "),
      };
    })
    .filter((row) => row.key);
  if (!rows.length) return [];
  return rows.map((row, idx) => ({
    id: `synthetic:${row.key}:${row.status}:${Math.floor(now / 60000)}:${idx}`,
    timestamp: new Date(now + idx * 250).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
    actor: row.label,
    phase: row.status === "running" ? "Working" : row.status === "done" ? "Done" : "Waiting",
    text:
      row.status === "running"
        ? "Processing current workspace"
        : row.status === "done"
          ? "Output saved to workspace"
          : "Queued for workspace handoff",
    detail:
      row.step ||
      (row.status === "running"
        ? "Reading the shared case context and preparing its stage output."
        : row.status === "done"
          ? "Stage output has been committed to the shared workspace."
          : "This agent will start as soon as upstream context is ready."),
    next:
      row.status === "running"
        ? "Continue runtime execution."
        : row.status === "done"
          ? "Hand off to the next agent."
          : "Start after handoff.",
    tone: (row.status === "running" ? "live" : row.status === "done" ? "success" : "neutral") as RunLogLine["tone"],
  }));
}

function loadFilters(): QueryParseFilters {
  if (typeof window === "undefined") {
    return {
      jurisdiction: "All India",
      legalDomain: "All Domains",
      dateRange: "Last 12 months",
      sourceTypes: ["Acts & Statutes", "Case Laws", "Regulations", "Legal Opinions"],
    };
  }
  try {
    const raw = sessionStorage.getItem(FILTERS_SESSION_KEY);
    if (!raw) throw new Error("missing");
    return JSON.parse(raw) as QueryParseFilters;
  } catch {
    return {
      jurisdiction: "All India",
      legalDomain: "All Domains",
      dateRange: "Last 12 months",
      sourceTypes: ["Acts & Statutes", "Case Laws", "Regulations", "Legal Opinions"],
    };
  }
}

function getDashboardRunStartedAtKey(caseId: string, runKey: string) {
  return `${DASHBOARD_RUN_STARTED_AT_PREFIX}${caseId}:${runKey || "pending"}`;
}

function readDashboardRunStartedAt(caseId: string, runKey: string) {
  if (typeof window === "undefined" || !caseId || !runKey) return null;
  try {
    const raw = window.sessionStorage.getItem(getDashboardRunStartedAtKey(caseId, runKey));
    const parsed = Number(raw || "");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function ensureDashboardRunStartedAt(caseId: string, runKey: string, fallbackTs: number) {
  if (typeof window === "undefined" || !caseId || !runKey) return fallbackTs;
  const existing = readDashboardRunStartedAt(caseId, runKey);
  if (existing) return existing;
  try {
    window.sessionStorage.setItem(getDashboardRunStartedAtKey(caseId, runKey), String(fallbackTs));
  } catch {
    // Ignore storage failures.
  }
  return fallbackTs;
}

function clearDashboardRunStartedAt(caseId: string, runKey: string) {
  if (typeof window === "undefined" || !caseId || !runKey) return;
  try {
    window.sessionStorage.removeItem(getDashboardRunStartedAtKey(caseId, runKey));
  } catch {
    // Ignore storage failures.
  }
}

export default function DashboardAnalysisLoading() {
  const [location, setLocation] = useLocation();
  const selectedRole = useAppStore((s) => s.selectedRole);
  const language = useAppStore((s) => s.language);
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);
  const { t } = useI18n();
  const translateUi = (value: string) => autoTranslateUiText(value, language);
  const [agentStatusMap, setAgentStatusMap] = useState<Record<string, { status: string; pct?: number; step?: string; reason?: string }>>({});
  const [activityLines, setActivityLines] = useState<RunLogLine[]>([]);
  const activityIdsRef = useRef<Set<string>>(new Set());
  const activityQueueRef = useRef<RunLogLine[]>([]);
  const lastActivityAtRef = useRef<number>(0);
  const drainTimerRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const routeRunAllId = params.get("runAllId") || "";
  const routeRunId = params.get("runId") || "";
  const [startedAt, setStartedAt] = useState<number>(() => {
    const stableKey = routeRunAllId || routeRunId || draftKey || caseId;
    return readDashboardRunStartedAt(caseId, stableKey) || Date.now();
  });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [runAllId, setRunAllId] = useState("");
  const [isStopping, setIsStopping] = useState(false);
  const filters = useMemo(() => loadFilters(), []);
  const loadingIntent = useMemo(() => getLoadingIntent(), [location]);

  const routeDraft = useMemo(() => {
    if (typeof window === "undefined" || !draftKey) return null;
    try {
      const raw = sessionStorage.getItem(`${DASHBOARD_RUN_DRAFT_PREFIX}${draftKey}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { query?: string; attachedDocs?: string[] };
      return {
        query: String(parsed.query || ""),
        attachedDocs: Array.isArray(parsed.attachedDocs) ? parsed.attachedDocs : [],
      };
    } catch {
      return null;
    }
  }, [draftKey]);
  const hasValidRunAllIntent = useMemo(() => {
    if (!isFreshLoadingIntent(loadingIntent)) return false;
    if (loadingIntent?.type !== "run_all") return false;
    if (draftKey && loadingIntent.draftKey && loadingIntent.draftKey !== draftKey) return false;
    if (caseId && loadingIntent.caseId && loadingIntent.caseId !== caseId) return false;
    return true;
  }, [caseId, draftKey, loadingIntent]);

  const expectedRoleAgents = useMemo(
    () => {
      const allowedRoleKeys = new Set(getRoleAgentsForRole(selectedRole).map((a) => a.agent_key));
      const runtimeKeys = Object.keys(agentStatusMap || {}).filter((key) => key in roleAgentRegistry);
      const visibleRuntimeKeys = runtimeKeys.filter((key) => allowedRoleKeys.has(key as any));
      if (visibleRuntimeKeys.length > 0) return visibleRuntimeKeys;
      return getRoleAgentsForRole(selectedRole).map((a) => a.agent_key);
    },
    [agentStatusMap, selectedRole],
  );

  const expectedAgentOrder = useMemo(
    () => [...COMMON_AGENT_ORDER, ...expectedRoleAgents],
    [expectedRoleAgents],
  );

  const preloaderItems = useMemo(() => {
    const keysFromStatus = Object.keys(agentStatusMap);
    const expectedSet = new Set<string>(expectedAgentOrder as string[]);
    const extras = keysFromStatus.filter((key) => !expectedSet.has(key));
    const source = [...expectedAgentOrder, ...extras];
    return source.map((key) => ({
      key,
      label: translateUi(AGENT_LABELS[key] || key.replaceAll("_", " ")),
      state: agentStatusMap[key]?.status || "queued",
      detail: translateUi(agentStatusMap[key]?.reason || agentStatusMap[key]?.step || ""),
      pct: agentStatusMap[key]?.pct,
    }));
  }, [agentStatusMap, expectedAgentOrder, language]);

  const completedCount = preloaderItems.filter((i) => String(i.state).toLowerCase() === "done").length;
  const runningCount = preloaderItems.filter((i) => {
    const s = String(i.state || "").toLowerCase();
    return s === "running" || s === "queued";
  }).length;
  const failedCount = preloaderItems.filter((i) => {
    const s = String(i.state || "").toLowerCase();
    return s === "error" || s === "failed";
  }).length;
  const [resultsReady, setResultsReady] = useState(false);
  const overallPct = computePipelineDisplayPct(preloaderItems, elapsedSec, resultsReady);
  const activeItem = preloaderItems.find((i) => String(i.state || "").toLowerCase() === "running")
    || preloaderItems.find((i) => String(i.state || "").toLowerCase() === "queued");
  const activeStepLabel = activeItem?.detail
    ? `${activeItem.detail}`
    : activeItem
      ? `${activeItem.label} is queued and waiting for workspace handoff.`
      : "Finalizing completed outputs and preparing the result workspace.";
  const elapsedLabel = useMemo(() => {
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, [elapsedSec]);
  const evidenceItems = useMemo(() => {
    const items: Array<{
      id: string;
      group: "CURRENT INPUT" | "USER DOC" | "LEGAL CORPUS";
      title: string;
      meta?: string;
      snippet?: string;
    }> = [];
    if (routeDraft?.query?.trim()) {
      items.push({
        id: "run-query",
        group: "CURRENT INPUT",
        title: "Submitted prompt",
        meta: "Current input",
        snippet: routeDraft.query.trim(),
      });
    }
    if (caseId) {
      items.push({
        id: "run-workspace",
        group: "USER DOC",
        title: `Workspace ${caseId.slice(0, 8)}`,
        meta: "Active case",
        snippet: routeDraft?.attachedDocs?.length
          ? `Selected documents: ${routeDraft.attachedDocs.slice(0, 4).join(", ")}${routeDraft.attachedDocs.length > 4 ? "…" : ""}`
          : "Shared workspace context is attached to all agents in this pipeline.",
      });
    }
    filters.sourceTypes.forEach((source, index) => {
      items.push({
        id: `source-${index}`,
        group: "LEGAL CORPUS",
        title: source,
        meta: filters.jurisdiction,
        snippet: `This source group is enabled for retrieval in the current run.`,
      });
    });
    return items;
  }, [caseId, filters.jurisdiction, filters.sourceTypes, routeDraft?.query]);

  const buildRunFailureMessage = (agents: Record<string, { status: string; pct?: number; step?: string; reason?: string }>) => {
    const failed = Object.entries(agents).filter(([, value]) => {
      const status = String(value?.status || "").toLowerCase();
      return status === "error" || status === "failed";
    });
    if (!failed.length) return "One or more automated agents failed. Please retry.";
    const [agentKey, details] = failed[0];
    const label = AGENT_LABELS[agentKey] || agentKey.replaceAll("_", " ");
    const reason = String(details?.reason || details?.step || "").trim();
    return reason ? `${label} failed: ${reason}` : `${label} failed during the automated run.`;
  };

  const buildRequestErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err || "");
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "Cannot reach the backend run service. Restart the backend if it was just changed, then retry.";
    }
    return message || "Automated run failed.";
  };

  const goToResultPage = (effectiveCaseId: string, activeRunAllId?: string, replace = true) => {
    if (activeRunAllId) {
      clearDashboardRunStartedAt(effectiveCaseId, activeRunAllId);
    }
    const suffix = activeRunAllId
      ? `?caseId=${encodeURIComponent(effectiveCaseId)}&runAllId=${encodeURIComponent(activeRunAllId)}`
      : `?caseId=${encodeURIComponent(effectiveCaseId)}`;
    setLocation(`/app/dashboard/analysis/result${suffix}`, { replace } as any);
  };

  const replaceLoadingUrl = (effectiveCaseId: string, nextRunAllId?: string, nextRunId?: string) => {
    if (typeof window === "undefined") return;
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("caseId", effectiveCaseId);
    if (draftKey) nextParams.set("draftKey", draftKey);
    if (nextRunAllId) nextParams.set("runAllId", nextRunAllId);
    else nextParams.delete("runAllId");
    if (nextRunId) nextParams.set("runId", nextRunId);
    else nextParams.delete("runId");
    window.history.replaceState({}, "", `${window.location.pathname}?${nextParams.toString()}`);
  };

  const handleBackToDashboard = async () => {
    if (isStopping) return;
    try {
      setIsStopping(true);
      if (caseId && runAllId) {
        await caseService.cancelRunAll(caseId, runAllId);
      }
    } catch {
      // Best-effort cancellation. Still return control to the dashboard.
    } finally {
      clearDashboardRunStartedAt(caseId, runAllId || routeRunAllId || routeRunId || draftKey || caseId);
      clearLoadingIntent({ type: "run_all", caseId, draftKey });
      setLocation("/app/dashboard", { replace: true } as any);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    const stableKey = runAllId || routeRunAllId || routeRunId || draftKey || caseId;
    if (!caseId || !stableKey) return;
    const persisted = ensureDashboardRunStartedAt(caseId, stableKey, startedAt);
    if (persisted !== startedAt) {
      setStartedAt(persisted);
    }
  }, [caseId, draftKey, routeRunAllId, routeRunId, runAllId, startedAt]);

  useEffect(() => {
    return () => {
      if (drainTimerRef.current) {
        window.clearInterval(drainTimerRef.current);
        drainTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (isFreshLoadingIntent(loadingIntent) && loadingIntent?.type === "query_parsing" && loadingIntent.draftKey) {
        const targetHref = `/app/agents/query/loading?${new URLSearchParams({
          ...(loadingIntent.caseId ? { caseId: loadingIntent.caseId } : {}),
          draftKey: loadingIntent.draftKey,
        }).toString()}`;
        setLocation(targetHref, { replace: true } as any);
        return;
      }
      if (!caseId) {
        setError("Missing case workspace. Go back to Dashboard and retry.");
        return;
      }
      if (!routeDraft && !routeRunAllId && !routeRunId) {
        setError("This automated pipeline launch is missing its dashboard run context. Go back to Dashboard and retry.");
        return;
      }
      try {
        const query = String(routeDraft?.query || "");
        const attachedDocs = Array.isArray(routeDraft?.attachedDocs) ? routeDraft.attachedDocs : undefined;
        let effectiveCaseId = caseId;
        if (!effectiveCaseId) {
          effectiveCaseId = await caseService.ensureCase("Quick Query Workspace");
        }
        let activeRunAllId = routeRunAllId;
        let queryRunId = routeRunId;

        if (!activeRunAllId && !queryRunId) {
          let started;
          try {
            started = await caseService.startRun(
              effectiveCaseId,
              filters,
              query.trim().length > 0 ? query : "",
              false,
              attachedDocs,
            );
          } catch (startError) {
            if (!isCaseNotFoundError(startError)) throw startError;
            const recoveredCaseId = await caseService.ensureCase("Quick Query Workspace");
            effectiveCaseId = recoveredCaseId;
            started = await caseService.startRun(
              effectiveCaseId,
              filters,
              query.trim().length > 0 ? query : "",
              false,
              undefined,
            );
          }
          activeRunAllId = ((started as any)?.run_all_id as string | undefined) || "";
          queryRunId = (started as any)?.runs?.query_parsing || (started as any)?.run_id || "";
          if (activeRunAllId) {
            setRunAllId(activeRunAllId);
          }
          const stableStartAt = ensureDashboardRunStartedAt(
            effectiveCaseId,
            activeRunAllId || queryRunId || draftKey || effectiveCaseId,
            Date.now(),
          );
          setStartedAt(stableStartAt);
          replaceLoadingUrl(effectiveCaseId, activeRunAllId || undefined, queryRunId || undefined);
        } else if (routeRunAllId) {
          setRunAllId(routeRunAllId);
          const stableStartAt = ensureDashboardRunStartedAt(effectiveCaseId, routeRunAllId, Date.now());
          setStartedAt(stableStartAt);
        } else if (queryRunId) {
          const stableStartAt = ensureDashboardRunStartedAt(effectiveCaseId, queryRunId, Date.now());
          setStartedAt(stableStartAt);
        }

        if (!activeRunAllId && !queryRunId) throw new Error("Could not start automated multi-agent run.");

        if (activeRunAllId) {
          setActivityLines([]);
          activityIdsRef.current = new Set();
          activityQueueRef.current = [];
          let doneStateDeadline = 0;
          while (!cancelled) {
            if (cancelled) return;
            const agg = await caseService.getRunAllStatus(effectiveCaseId, activeRunAllId);
            const mapped: Record<string, { status: string; pct?: number; step?: string; reason?: string }> = {};
            Object.entries(agg.agents || {}).forEach(([key, value]) => {
              const v = value || ({} as any);
              mapped[key] = {
                status: String(v.status || "queued"),
                pct: typeof v.pct === "number" ? v.pct : undefined,
                step: typeof v.step === "string" ? v.step : undefined,
                reason: typeof v.reason === "string" ? v.reason : undefined,
              };
            });
            setAgentStatusMap(mapped);
            let appendedCount = 0;
            const enqueueLines = (lines: RunLogLine[]) => {
              for (const line of lines) {
                if (activityIdsRef.current.has(line.id)) continue;
                activityIdsRef.current.add(line.id);
                activityQueueRef.current.push(line);
              }
            };
            const startDrainTimer = () => {
              if (drainTimerRef.current) return;
              drainTimerRef.current = window.setInterval(() => {
                if (!activityQueueRef.current.length) {
                  if (drainTimerRef.current) {
                    window.clearInterval(drainTimerRef.current);
                    drainTimerRef.current = null;
                  }
                  return;
                }
                const nextLine = activityQueueRef.current.shift();
                if (nextLine) {
                  setActivityLines((prev) => [...prev, nextLine]);
                  lastActivityAtRef.current = Date.now();
                }
              }, 900);
            };
            const shouldEmitSynthetic = !Array.isArray(agg.activity) || agg.activity.length < expectedAgentOrder.length;
            if (Array.isArray(agg.activity)) {
              const incoming = agg.activity.map((item) => ({
                id: String(item.id),
                timestamp: String(item.timestamp),
                actor: item.actor ? String(item.actor) : undefined,
                phase: item.phase ? String(item.phase) : undefined,
                text: String(item.text || ""),
                detail: item.detail ? String(item.detail) : undefined,
                next: item.next ? String(item.next) : undefined,
                tone: item.tone,
              }));
              enqueueLines(incoming);
            }
            if (shouldEmitSynthetic || !activityQueueRef.current.length) {
              const synthetic = buildSyntheticActivity(mapped, Date.now(), expectedAgentOrder);
              if (synthetic.length) enqueueLines(synthetic);
            }
            if (activityQueueRef.current.length) startDrainTimer();
            if (agg.overall_status === "done") {
              if (!doneStateDeadline) {
                doneStateDeadline = Date.now() + 20_000;
              }
              const expectedActivityCount = expectedAgentOrder.length;
              const currentCount = activityIdsRef.current.size;
              if (currentCount < expectedActivityCount) {
                const synthetic = buildSyntheticActivity(mapped, Date.now(), expectedAgentOrder);
                if (synthetic.length) enqueueLines(synthetic);
              }
              const queueDrainDeadline = Date.now() + 1800;
              while (activityQueueRef.current.length && Date.now() < queueDrainDeadline) {
                if (!drainTimerRef.current) startDrainTimer();
                await new Promise((resolve) => window.setTimeout(resolve, 250));
              }
              const caseDetails = await caseService.fetchCase(effectiveCaseId).catch(() => null);
              const outputs = (caseDetails as any)?.outputs || {};
              const finalReady = areAllAgentResultsReady(mapped, outputs, expectedAgentOrder);
              setResultsReady(finalReady);
              if (finalReady || Date.now() >= doneStateDeadline) {
                break;
              }
              await new Promise((resolve) => window.setTimeout(resolve, 700));
              continue;
            }
            if (agg.overall_status === "cancelled") return;
            if (agg.overall_status === "error") throw new Error(buildRunFailureMessage(mapped));
            await new Promise((resolve) => window.setTimeout(resolve, 450));
          }
          if (cancelled) return;
          await caseService.fetchCase(effectiveCaseId).catch(() => null);
          if (cancelled) return;
          goToResultPage(effectiveCaseId, activeRunAllId);
          clearLoadingIntent({ type: "run_all", caseId: effectiveCaseId, draftKey });
        } else {
          while (!cancelled) {
            if (cancelled) return;
            const status = await caseService.getRunStatus(queryRunId);
            const pct = Number((status as any)?.progress?.pct || 0);
            setAgentStatusMap({
              query_parsing: {
                status: status.status === "SUCCEEDED" ? "done" : status.status === "FAILED" ? "error" : "running",
                pct,
                step: (status as any)?.progress?.step || "",
                reason: (status as any)?.error_message || "",
              },
            });
            if (status.status === "SUCCEEDED") break;
            if (status.status === "FAILED") throw new Error((status as any)?.error_message || "Run failed.");
            await new Promise((resolve) => window.setTimeout(resolve, 450));
          }
          if (cancelled) return;
          await caseService.fetchCase(effectiveCaseId).catch(() => null);
          if (cancelled) return;
          goToResultPage(effectiveCaseId);
          clearLoadingIntent({ type: "run_all", caseId: effectiveCaseId, draftKey });
        }

        await caseService.listCases().then((rows) => {
          const row = rows.find((r) => r.case_id === effectiveCaseId);
          if (row) setCaseWorkspace(effectiveCaseId, row.title);
        }).catch(() => undefined);
      } catch (e) {
        if (cancelled) return;
        clearDashboardRunStartedAt(caseId, runAllId || routeRunAllId || routeRunId || draftKey || caseId);
        setError(buildRequestErrorMessage(e));
      } finally {
        if (typeof window !== "undefined" && draftKey) {
          sessionStorage.removeItem(`${DASHBOARD_RUN_DRAFT_PREFIX}${draftKey}`);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [caseId, draftKey, filters, hasValidRunAllIntent, loadingIntent, routeDraft, setCaseWorkspace, setLocation]);

  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <ErrorState
          title={t("dashboardRun.failedTitle")}
          description={error}
          actionLabel={t("dashboardRun.backToDashboard")}
          onAction={() => {
            clearLoadingIntent({ type: "run_all", caseId, draftKey });
            setLocation("/app/dashboard", { replace: true } as any);
          }}
        />
      </div>
    );
  }

  return (
    <AgentProcessingScreen
      runType="multi_agent"
      eyebrow={t("dashboardRun.eyebrow")}
      title={t("dashboardRun.title")}
      subtitle={t("dashboardRun.subtitle")}
      statusLabel={activeItem?.label || t("dashboardRun.preparingPipeline")}
      statusDetail={
        activeItem
          ? `${translateUi(activeStepLabel)} ${completedCount > 0 ? `${completedCount} ${t("dashboardRun.agentsFinished")}.` : ""}`
          : activeStepLabel
      }
      progressPct={overallPct}
      steps={preloaderItems}
      metrics={[
        { label: t("run.completed"), value: `${completedCount}/${preloaderItems.length}`, hint: t("dashboardRun.agentsFinished") },
        { label: t("common.live"), value: runningCount, hint: t("dashboardRun.runningOrQueued") },
        { label: t("run.issues"), value: failedCount, hint: t("dashboardRun.failedAgents") },
        { label: "Elapsed", value: elapsedLabel, hint: t("dashboardRun.wallTime") },
      ]}
      metaItems={[
        { label: t("dashboardRun.workspace"), value: caseId.slice(0, 8) },
        { label: t("dashboardRun.agentScope"), value: t("dashboardRun.totalAgents", { count: preloaderItems.length }) },
        { label: t("common.jurisdiction"), value: translateUi(filters.jurisdiction) },
        { label: t("dashboardRun.sources"), value: translateUi(filters.sourceTypes.join(", ")) },
      ]}
      evidenceItems={evidenceItems}
      activityLines={activityLines}
      action={
        <Button variant="outline" size="sm" onClick={() => void handleBackToDashboard()} disabled={isStopping}>
          {t("dashboardRun.backToDashboard")}
        </Button>
      }
    />
  );
}

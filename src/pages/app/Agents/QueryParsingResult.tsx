import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/lib/magic-ui";
import { useAppStore } from "@/store";
import { caseService, mapQueryParse, type CaseDetailsResponse } from "@/services/caseService";
import { runService } from "@/services/runService";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import AgentReportBackButton from "@/components/app/AgentReportBackButton";
import { BookOpenText, CheckCircle2, Download, RefreshCw, Scale, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { readQueryParseTranscript } from "@/lib/queryParseTranscript";

type QueryCitation = { doc_id?: string; chunk_id?: string; snippet?: string; source_type?: string; source_label?: string };
type QueryIssueGroup = { title: string; description: string; priority: "high" | "medium" | "low" };

function renderInlineText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const text: string = value.map((item) => renderInlineText(item, "")).filter(Boolean).join(", ").trim();
    return text || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.country === "string" && record.country.trim()) return record.country.trim();
    if (typeof record.primary === "string" && record.primary.trim()) return record.primary.trim();
    if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
    if (typeof record.label === "string" && record.label.trim()) return record.label.trim();
    const text: string = Object.values(record).map((item) => renderInlineText(item, "")).filter(Boolean).join(", ").trim();
    return text || fallback;
  }
  return fallback;
}

function normalizeCompareText(value: unknown) {
  return String(renderInlineText(value, ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPartyDisplayName(value: unknown) {
  const raw = renderInlineText(value)
    .replace(/^the manager[:, -]*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  const companyTailMatch = raw.match(/^(.*?\b(?:bank limited|bank ltd\.?|pvt\.?\s*ltd\.?|private limited|limited|ltd\.?|technologies pvt\.?\s*ltd\.?|finance limited|finance ltd\.?))\b/i);
  const trimmed = companyTailMatch?.[1]?.trim() || raw;
  const addressLike = /\b(survey no|plot no|unit\b|floor\b|sector\b|road\b|rd\b|street\b|lane\b|nagar\b|complex\b|tower\b|office\b|branch\b|village\b|mandal\b|district\b|near\b|old\b|west bay\b|baner\b|mumbai\b|pune\b|gurugram\b|gurgaon\b|chennai\b|thrissur\b|vadodara\b|maharashtra\b|haryana\b|kerala\b|tamil nadu\b|gujarat\b|india\b|\b\d{5,6}\b)\b/i;
  const parts = trimmed
    .split(/[,/|]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !addressLike.test(part) && !/^(to|manager)$/i.test(part));
  const deduped = parts.filter((part, index, arr) =>
    arr.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index,
  );
  const best = deduped.slice(0, 2);
  return (best.length ? best : [trimmed]).join(" / ");
}

function formatCitationSnippet(value: unknown) {
  const raw = renderInlineText(value)
    .replace(/\s+/g, " ")
    .replace(/^other\s+\.{0,3}/i, "")
    .trim();
  if (!raw) return "Citation snippet unavailable.";
  const sentences = raw
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const addressLike = /\b(survey no|plot no|unit\b|floor\b|sector\b|road\b|rd\b|street\b|lane\b|nagar\b|complex\b|tower\b|office\b|branch\b|village\b|mandal\b|district\b|near\b|old\b|west bay\b|baner\b|mumbai\b|pune\b|gurugram\b|gurgaon\b|chennai\b|thrissur\b|vadodara\b|maharashtra\b|haryana\b|kerala\b|tamil nadu\b|gujarat\b|india\b|\b\d{5,6}\b)\b/i;
  const ranked = sentences
    .filter((sentence) => sentence.length >= 30)
    .map((sentence) => ({
      sentence,
      score:
        (/brief facts|prayer|injunction|plaintiff|petitioner|respondent|harass|loan|installment|court/i.test(sentence) ? 3 : 0) +
        (/i\.a\. notice|between|to the manager/i.test(sentence) ? -1 : 0) +
        (addressLike.test(sentence) ? -2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length);
  const best = ranked[0]?.sentence || raw;
  return best.length > 160 ? `${best.slice(0, 157).trim()}...` : best;
}

function formatCitationGroupLabel(value: string) {
  const label = String(value || "").trim().toUpperCase();
  if (label === "CASE DOCUMENT") return "Case Document";
  if (label === "PROMPT INPUT") return "Prompt Input";
  if (label === "USER_DOC") return "Case Document";
  if (label === "LEGAL_CORPUS") return "Legal Corpus";
  return label || "Sources";
}

function isPlaceholderAuthorityValue(value: unknown) {
  const normalized = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  return normalized === "string" || normalized === "string|null" || normalized === "null" || normalized === "undefined";
}

function isPromptEchoText(text: unknown, prompt: string) {
  const candidate = normalizeCompareText(text);
  const source = normalizeCompareText(prompt);
  if (!candidate || !source) return false;
  const sourceLead = source.split(" ").slice(0, 12).join(" ");
  if (sourceLead && candidate.includes(sourceLead)) return true;
  const promptishSignals = [
    "perform a complete legal analysis",
    "identify the parties",
    "identify the underlying transaction",
    "state what should be prepared next",
    "clearly separate what is supported",
  ];
  return promptishSignals.some((phrase) => candidate.includes(phrase));
}

function isPromptTemplateText(text: unknown) {
  const candidate = normalizeCompareText(text);
  if (!candidate) return false;
  const promptishSignals = [
    "perform a complete legal analysis",
    "create a contract dispute study brief",
    "identify the parties",
    "identify the main legal issues",
    "identify the underlying transaction",
    "state what should be prepared next",
    "clearly separate what is supported",
    "likely outcome factors",
    "payment issues delay or non performance events",
  ];
  return promptishSignals.some((phrase) => candidate.includes(phrase));
}

function isCurrentInputPromptSlice(citation: QueryCitation, prompt: string) {
  const sourceType = String(citation.source_type || "").toLowerCase().trim();
  const docId = String(citation.doc_id || "").toLowerCase().trim();
  const isCurrentInput = sourceType === "current_input" || docId === "current_input";
  if (!isCurrentInput) return false;
  return isPromptEchoText(citation.snippet, prompt) || isPromptTemplateText(citation.snippet);
}

function buildFactLedSummary(parseResult: any, inputMode?: string) {
  const domain = renderInlineText(parseResult.legalDomain || parseResult.domain, "General dispute");
  const keyFacts = parseResult?.keyFacts || {};
  const fragments: string[] = [];
  const courtName = renderInlineText(keyFacts.court_name);
  const disputeSummary = renderInlineText(keyFacts.dispute_summary);
  const normalizedMode = String(inputMode || "");
  const isPromptOnly = normalizedMode === "prompt_only";
  const sourceLabel =
    normalizedMode === "prompt_only"
      ? "submitted case query"
      : normalizedMode === "docs_plus_prompt"
        ? "submitted case query and uploaded material"
        : "uploaded case material";
  const reliefs = Array.isArray(keyFacts.reliefs_claimed) ? keyFacts.reliefs_claimed.filter(Boolean).slice(0, 2) : [];
  const parties = Array.isArray(keyFacts.detailed_parties)
    ? keyFacts.detailed_parties
        .map((party: any) => [renderInlineText(party.role), renderInlineText(party.name)].filter(Boolean).join(" "))
        .filter(Boolean)
        .slice(0, 2)
    : [];
  if (courtName) {
    fragments.push(isPromptOnly ? `The submitted case query references ${courtName}.` : `The uploaded case material is drawn from ${courtName}.`);
  }
  if (parties.length > 0) {
    fragments.push(isPromptOnly ? `The submitted case query identifies ${parties.join(" and ")}.` : `The extracted filing identifies ${parties.join(" and ")}.`);
  }
  if (disputeSummary) {
    fragments.push(disputeSummary.endsWith(".") ? disputeSummary : `${disputeSummary}.`);
  }
  if (keyFacts.outstanding_amount_inr) {
    fragments.push(`The matter appears to involve an outstanding amount of INR ${Number(keyFacts.outstanding_amount_inr).toLocaleString("en-IN")}.`);
  }
  if (renderInlineText(keyFacts.payment_terms)) {
    fragments.push(`Payment terms are mentioned as ${renderInlineText(keyFacts.payment_terms)}.`);
  }
  if (renderInlineText(keyFacts.delivery_terms)) {
    fragments.push(`Delivery or performance obligations are also referenced.`);
  }
  const grounds = Array.isArray(parseResult?.legalGrounds) ? parseResult.legalGrounds.filter(Boolean).slice(0, 2) : [];
  if (grounds.length > 0) {
    fragments.push(`The main legal issues currently identified are ${grounds.join(" and ")}.`);
  }
  const requested = Array.isArray(parseResult?.requestedOutcomes) ? parseResult.requestedOutcomes.filter(Boolean).slice(0, 2) : [];
  if (requested.length > 0) {
    fragments.push(`The requested next steps appear to focus on ${requested.join(" and ").replaceAll("_", " ")}.`);
  }
  if (reliefs.length > 0) {
    fragments.push(`Relief sought appears to include ${reliefs.join(" and ")}.`);
  }
  if (!fragments.length) {
    fragments.push(`This run classifies the matter under ${domain} and has extracted an initial set of legal issues from the ${sourceLabel}.`);
  }
  return fragments.slice(0, 3).join(" ");
}

function shouldUseDetailedExecutiveSummary(summary: string) {
  const text = String(summary || "").replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (/^no summary available\.?$/i.test(text)) return true;
  if (text.length < 220) return true;
  const sentenceCount = text.split(/(?<=[.?!])\s+/).filter(Boolean).length;
  return sentenceCount < 3;
}

function buildDetailedExecutiveSummary(params: {
  parseResult: any;
  inputMode?: string;
  issuePoints: string[];
  uploadedDocsCount: number;
}) {
  const { parseResult, inputMode, issuePoints, uploadedDocsCount } = params;
  const keyFacts = parseResult?.keyFacts || {};
  const domain = renderInlineText(parseResult?.legalDomain || parseResult?.domain, "General legal dispute");
  const jurisdiction = renderInlineText(parseResult?.jurisdiction || parseResult?.jurisdictionGuess, "India");
  const state = renderInlineText(parseResult?.state, "");
  const riskLevel = renderInlineText(parseResult?.riskLabel, "Medium");
  const title = renderInlineText(parseResult?.caseTitle, "");
  const disputeSummary = renderInlineText(keyFacts?.dispute_summary, "");
  const amountInIssue = Number(keyFacts?.outstanding_amount_inr || 0);
  const contractDate = renderInlineText(keyFacts?.contract_date, "");
  const paymentTerms = renderInlineText(keyFacts?.payment_terms, "");
  const deliveryTerms = renderInlineText(keyFacts?.delivery_terms, "");
  const delayWindow = renderInlineText(keyFacts?.delay_days_range, "");
  const requestedOutcomes = Array.isArray(parseResult?.requestedOutcomes)
    ? parseResult.requestedOutcomes.map((item: any) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];
  const legalGrounds = Array.isArray(parseResult?.legalGrounds)
    ? parseResult.legalGrounds.map((item: any) => String(item || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  const evidenceAvailable = Array.isArray(parseResult?.evidenceAvailable)
    ? parseResult.evidenceAvailable.map((item: any) => String(item || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  const sourceModeLabel =
    inputMode === "prompt_only"
      ? "submitted case query"
      : inputMode === "docs_only"
        ? "uploaded case documents"
        : inputMode === "docs_plus_prompt"
          ? "submitted case query and uploaded documents"
          : "available case context";

  const opening = [
    title ? `This report evaluates ${title} under ${domain}.` : `This report evaluates the dispute under ${domain}.`,
    `The current parsing run maps the matter to ${jurisdiction}${state ? `, ${state}` : ""} and classifies preliminary exposure as ${riskLevel} risk.`,
    amountInIssue > 0 ? `The extracted financial exposure currently in issue is approximately INR ${amountInIssue.toLocaleString("en-IN")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const factualNarrativeParts = [
    disputeSummary
      ? `From the ${sourceModeLabel}, the core factual narrative is: ${disputeSummary}`
      : `From the ${sourceModeLabel}, the parser has extracted the core dispute context and converted it into a structured legal intake.`,
    contractDate ? `The timeline indicates a key transaction/event date around ${contractDate}.` : "",
    delayWindow ? `Delay or default exposure appears within a window of ${delayWindow}.` : "",
    paymentTerms ? `Payment terms extracted: ${paymentTerms}.` : "",
    deliveryTerms ? `Delivery/performance terms extracted: ${deliveryTerms}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const issueNarrative = [
    issuePoints.length > 0
      ? `Primary legal issues identified at this stage include ${issuePoints.slice(0, 4).join(", ")}.`
      : "",
    legalGrounds.length > 0
      ? `Likely legal grounds currently inferred are ${legalGrounds.join(", ")}.`
      : "",
    requestedOutcomes.length > 0
      ? `Requested practical outcomes appear to focus on ${requestedOutcomes.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const evidenceNarrative = [
    evidenceAvailable.length > 0
      ? `Evidence signals already detected include ${evidenceAvailable.join(", ")}.`
      : "Evidence signals were limited in this pass; additional supporting records can improve downstream agent precision.",
    uploadedDocsCount > 0
      ? `${uploadedDocsCount} uploaded case document${uploadedDocsCount > 1 ? "s were" : " was"} considered in this run context.`
      : "",
    "Recommended next step: validate missing dates, obligations, and documentary gaps before relying on final downstream strategy outputs.",
  ]
    .filter(Boolean)
    .join(" ");

  return [opening, factualNarrativeParts, issueNarrative, evidenceNarrative]
    .filter((part) => String(part || "").trim().length > 0)
    .join("\n\n");
}

function buildGroundedResearchNote(parseResult: any, hasLegalCorpusContext: boolean, citationCount: number, inputMode?: string) {
  if (hasLegalCorpusContext) {
    return "This section highlights the grounded authority and source support used to refine the extracted issue map.";
  }
  const domain = renderInlineText(parseResult.legalDomain || parseResult.domain, "the current matter");
  const normalizedMode = String(inputMode || "");
  const sourceLabel =
    normalizedMode === "prompt_only"
      ? "submitted case query"
      : normalizedMode === "docs_plus_prompt"
        ? "submitted case query and uploaded material"
        : "uploaded material";
  return citationCount > 0
    ? `This section shows the grounded source support used to extract the ${domain} issue map from the ${sourceLabel}.`
    : `This section summarizes the grounded source support currently available for ${domain}.`;
}

function normalizeSummaryForInputMode(text: string, inputMode?: string) {
  if (!text) return text;
  if (String(inputMode || "") !== "prompt_only") return text;
  const replacements: Array<[RegExp, string]> = [
    [/\bthe uploaded material\b/gi, "the submitted case query"],
    [/\buploaded material\b/gi, "submitted case query"],
    [/\bthe uploaded case material\b/gi, "the submitted case query"],
    [/\buploaded case material\b/gi, "submitted case query"],
    [/\bthe uploaded case document\b/gi, "the submitted case query"],
    [/\buploaded case document\b/gi, "submitted case query"],
    [/\bthe uploaded legal document\b/gi, "the submitted case query"],
    [/\buploaded legal document\b/gi, "submitted case query"],
    [/\bthe uploaded document\b/gi, "the submitted case query"],
    [/\buploaded document\b/gi, "submitted case query"],
    [/\buploaded documents\b/gi, "submitted case query"],
  ];
  return replacements.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

export default function QueryParsingResult() {
  const [, setLocation] = useLocation();
  const casesById = useAppStore((s) => s.casesById);
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);
  const language = useAppStore((s) => s.language);
  const [loading, setLoading] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveCaseDetails, setLiveCaseDetails] = useState<CaseDetailsResponse | null>(null);

  const params = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    [],
  );
  const caseId = params.get("caseId") || "";
  const expectedRunId = params.get("runId") || "";
  const inputMode = params.get("inputMode") || "auto";
  const routeAttachedDocs = useMemo(() => {
    const raw = params.get("attachedDocs");
    if (!raw) return [] as string[];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .filter((name, idx, arr) => arr.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === idx);
    } catch {
      return [];
    }
  }, [params]);
  const caseRecord = caseId ? casesById[caseId] : undefined;
  const liveParseResult = useMemo(
    () => (liveCaseDetails?.outputs?.query_parsing ? mapQueryParse(liveCaseDetails.outputs.query_parsing) : null),
    [liveCaseDetails],
  );
  const parseResult = liveParseResult || caseRecord?.outputs.query_parse;
  const parseRunId = liveParseResult?.provenance?.run_id || parseResult?.provenance?.run_id || "";
  const transcript = useMemo(
    () => readQueryParseTranscript(caseId, parseRunId || expectedRunId || undefined),
    [caseId, expectedRunId, parseRunId],
  );
  const transcriptLines = useMemo(
    () => (transcript?.lines || []).filter((line) => line.phase !== "Starting" || line.text !== "Run accepted and starting"),
    [transcript],
  );
  const [runTerminalWithoutExactMatch, setRunTerminalWithoutExactMatch] = useState(false);
  const hasExpectedRunMismatch = Boolean(
    expectedRunId &&
    !runTerminalWithoutExactMatch &&
    (!parseResult || parseRunId !== expectedRunId),
  );
  const [waitTimedOut, setWaitTimedOut] = useState(false);
  const submittedQueryTextRaw = (caseRecord?.lastQuery || "").trim();
  const isAttachmentMarkerOnlyQuery = submittedQueryTextRaw
    ? submittedQueryTextRaw
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .every((line) => /^\[Attached documents:\s*.+\]$/i.test(line))
    : false;
  const submittedQueryText =
    inputMode === "docs"
      ? ""
      : (isAttachmentMarkerOnlyQuery ? "" : submittedQueryTextRaw);
  const workspaceUploadedDocs = useMemo(
    () =>
      ((liveCaseDetails?.documents || []).length
        ? liveCaseDetails!.documents.map((doc) => doc.name)
        : (caseRecord?.uploadedDocuments || []))
        .map((name) => String(name || "").trim())
        .filter(Boolean)
        .filter((name) => {
          const n = name.toLowerCase();
          return n !== "query-context" && n !== "query input" && n !== "pasted text";
        })
        .filter((name, idx, arr) => arr.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === idx),
    [caseRecord?.uploadedDocuments, liveCaseDetails],
  );
  const uploadedDocs = routeAttachedDocs.length > 0 ? routeAttachedDocs : workspaceUploadedDocs;
  const resolvedWorkspaceTitle = useMemo(() => {
    const parsedTitle = typeof (parseResult as any)?.caseTitle === "string" ? String((parseResult as any).caseTitle).trim() : "";
    return parsedTitle || caseRecord?.title || "Query Parsing Workspace";
  }, [caseRecord?.title, parseResult]);

  useEffect(() => {
    if (!caseId) return;
    const currentTitle = String(caseRecord?.title || "").trim();
    const nextTitle = String(resolvedWorkspaceTitle || "").trim();
    if (!nextTitle || currentTitle === nextTitle) return;
    setCaseWorkspace(caseId, nextTitle);
  }, [caseId, caseRecord?.title, resolvedWorkspaceTitle, setCaseWorkspace]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!caseId) return;
      setLoading(true);
      setWaitTimedOut(false);
      setLoadError(null);
      try {
        if (!expectedRunId) {
          const details = await caseService.fetchCase(caseId);
          if (!cancelled) setLiveCaseDetails(details);
          return;
        }
        let matched = false;
        let latestDetails: CaseDetailsResponse | null = null;
        for (let attempt = 0; attempt < 180; attempt += 1) {
          const latest = await caseService.fetchCase(caseId);
          latestDetails = latest;
          const payloadRunId =
            latest?.outputs?.query_parsing?.run_id ||
            latest?.outputs?.query_parsing?.provenance?.run_id ||
            "";
          if (payloadRunId === expectedRunId) {
            matched = true;
            break;
          }
          try {
            const latestRunStatus = await caseService.getRunStatus(expectedRunId);
            const terminal =
              latestRunStatus.status === "SUCCEEDED" ||
              latestRunStatus.status === "FAILED";
            const hasAnyQueryPayload = Boolean(latest?.outputs?.query_parsing);
            if (terminal && hasAnyQueryPayload) {
              matched = true;
              if (!cancelled) setRunTerminalWithoutExactMatch(true);
              break;
            }
          } catch {
            // Keep polling the case payload if the run status endpoint is transiently unavailable.
          }
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
        if (!cancelled && latestDetails) setLiveCaseDetails(latestDetails);
        if (!matched && !cancelled) {
          setWaitTimedOut(true);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load the latest query parsing result.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [caseId, expectedRunId]);

  useEffect(() => {
    if (!expectedRunId || !parseResult) return;
    let cancelled = false;
    const stopIfTerminal = async () => {
      try {
        const status = await caseService.getRunStatus(expectedRunId);
        if (cancelled) return;
        if (status.status === "RUNNING" || status.status === "PENDING") return;
        await runService.stop(expectedRunId).catch(() => undefined);
      } catch {
        // Best-effort only.
      }
    };
    void stopIfTerminal();
    return () => {
      cancelled = true;
    };
  }, [expectedRunId, parseResult]);

  useEffect(() => {
    if (!caseId) return;
    void caseService.fetchCase(caseId).then(setLiveCaseDetails).catch(() => undefined);
  }, [caseId, language]);

  if (!caseId) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <EmptyState
          title="No query result selected"
          description="Run Query Parsing first to generate a legal analysis report."
          actionLabel="Back to Query Parsing"
          onAction={() => setLocation("/app/agents/query")}
        />
      </div>
    );
  }

  if (loading && hasExpectedRunMismatch) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <LoadingState title="Loading query result" description="Fetching the latest query parsing output from your case workspace." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <ErrorState
          title="Query result unavailable"
          description={loadError}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            setLoadError(null);
            void caseService.fetchCase(caseId).then(setLiveCaseDetails).catch((error) => {
              setLoadError(error instanceof Error ? error.message : "Unable to load the latest query parsing result.");
            }).finally(() => setLoading(false));
          }}
        />
      </div>
    );
  }

  if (!parseResult || hasExpectedRunMismatch) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <EmptyState
          title={waitTimedOut ? "Latest query result is still syncing" : "No query parsing result yet"}
          description={
            waitTimedOut
              ? "The new analysis run has not published its Query Parsing output yet. Refresh this page in a moment or go back and retry."
              : "Run Query Parsing to generate the legal analysis report."
          }
          actionLabel={waitTimedOut ? "Retry Result Load" : "Go to Query Parsing"}
          onAction={() => {
            if (waitTimedOut) {
              setLoading(true);
              setWaitTimedOut(false);
              void caseService
                .fetchCase(caseId)
                .finally(() => setLoading(false));
              return;
            }
            setLocation(`/app/agents/query${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ""}`);
          }}
        />
      </div>
    );
  }

  const confidencePct = Math.max(
    1,
    Math.min(
      99,
      typeof parseResult.confidenceScore === "number"
        ? Math.round(parseResult.confidenceScore)
        : Math.round(((parseResult.confidence ?? 0.78) as number) * 100),
    ),
  );
  const citations = ((parseResult.citations || []) as QueryCitation[])
    .filter((citation: QueryCitation) => !isCurrentInputPromptSlice(citation, submittedQueryText))
    .filter((citation: QueryCitation, index: number, arr: QueryCitation[]) => {
      const norm = String(citation.snippet || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 140);
      const key = norm
        ? `${citation.source_type || ""}::${citation.doc_id || ""}::${norm}`
        : `${citation.source_type || ""}::${citation.doc_id || ""}::${citation.chunk_id || ""}`;
      return (
        arr.findIndex((x: QueryCitation) => {
          const xNorm = String(x.snippet || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 140);
          const xKey = xNorm
            ? `${x.source_type || ""}::${x.doc_id || ""}::${xNorm}`
            : `${x.source_type || ""}::${x.doc_id || ""}::${x.chunk_id || ""}`;
          return xKey === key;
        }) === index
      );
    });
  const groupedCitations = citations.reduce((acc: Record<string, QueryCitation[]>, citation: QueryCitation) => {
    const key = citation.source_label || citation.source_type || "Sources";
    acc[key] = acc[key] || [];
    acc[key].push(citation);
    return acc;
  }, {});
  const parserPath = String(parseResult?.qaDebug?.parser_path || "").trim();
  const nonCaseGuardPaths = new Set([
    "deterministic_low_signal_query_guard",
    "deterministic_short_input_guard",
    "deterministic_missing_input_guard",
    "deterministic_non_legal_input_guard",
    "deterministic_mixed_case_bundle_guard",
    "deterministic_prompt_template_guard",
  ]);
  const rejectedFlag = (parseResult as any)?.rejectedInput === true;
  const outputRejected = String((parseResult as any)?.outputMode || "").toLowerCase() === "rejected_input";
  const invalidRejected = (parseResult as any)?.analysisValid === false && (rejectedFlag || outputRejected);
  const isRejectedNonCase =
    rejectedFlag ||
    outputRejected ||
    invalidRejected ||
    nonCaseGuardPaths.has(parserPath) ||
    /^rejected non-case input|^rejected prompt-template input/i.test(
      String(parseResult?.summary || parseResult?.executiveSummaryText || ""),
    );
  const parsedIssuePoints = (
    (parseResult.legalGrounds?.length
      ? parseResult.legalGrounds
      : parseResult.issueGroups?.length
        ? (parseResult.issueGroups as QueryIssueGroup[]).map((g: QueryIssueGroup) => g.title)
        : parseResult.highlights) || []
  )
    .map((item: string) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
  const inputStats = (parseResult as any)?.qaDebug?.input_stats || (parseResult as any)?.qaDebug?.inputStats || {};
  const resolvedInputMode =
    String(inputStats?.input_mode || "").trim() ||
    (submittedQueryText
      ? (uploadedDocs.length > 0 ? "docs_plus_prompt" : "prompt_only")
      : uploadedDocs.length > 0
        ? "docs_only"
        : "no_input");
  const executiveSummaryRaw = isPromptEchoText(parseResult.executiveSummaryText || parseResult.summary, submittedQueryText)
    ? buildFactLedSummary(parseResult, resolvedInputMode)
    : renderInlineText(parseResult.executiveSummaryText || parseResult.summary, "No summary available.");
  const legalResearchRaw = isPromptEchoText(parseResult.executiveSummaryText || parseResult.summary, submittedQueryText)
    ? buildFactLedSummary(parseResult, resolvedInputMode)
    : renderInlineText(parseResult.executiveSummaryText || parseResult.summary, "No analysis text available.");
  const detailedExecutiveSummary = buildDetailedExecutiveSummary({
    parseResult,
    inputMode: resolvedInputMode,
    issuePoints: parsedIssuePoints,
    uploadedDocsCount: uploadedDocs.length,
  });
  const executiveSummaryText = normalizeSummaryForInputMode(
    shouldUseDetailedExecutiveSummary(executiveSummaryRaw) ? detailedExecutiveSummary : executiveSummaryRaw,
    resolvedInputMode,
  );
  const legalResearchSummary = normalizeSummaryForInputMode(legalResearchRaw, resolvedInputMode);
  const legalCorpusCitations = citations
    .filter((c: any) => String(c?.source_type || "").toLowerCase() === "legal_corpus")
    .slice(0, 6);
  const llmOrRagAuthorities = Array.isArray(parseResult.legalResearchAuthorities)
    ? parseResult.legalResearchAuthorities
    : [];
  const hasLegalCorpusContext =
    legalCorpusCitations.length > 0 ||
    llmOrRagAuthorities.some((row: any) => String(row?.source || "").toLowerCase().trim() === "rag");
  const legalAuthorities =
    llmOrRagAuthorities.length > 0
      ? llmOrRagAuthorities
          .slice(0, 5)
          .map((row: any, idx: number) => ({
            title: String(row?.title || `Authority ${idx + 1}`).trim(),
            section: row?.section ? String(row.section).trim() : null,
            snippet: String(row?.relevance || "Relevant authority identified for this dispute context.").trim(),
            sourceLabel: row?.source === "rag" ? "LEGAL_CORPUS" : row?.source === "llm" ? "LLM_FALLBACK" : "LEGAL_AUTHORITY",
          }))
          .filter((row) => !isPlaceholderAuthorityValue(row.title) && !isPlaceholderAuthorityValue(row.section) && !isPlaceholderAuthorityValue(row.snippet))
      : legalCorpusCitations.map((citation: any, idx: number) => {
          const snippet = String(citation?.snippet || "").replace(/\s+/g, " ").trim();
          const sectionMatch = snippet.match(/\b(?:section|sec\.?)\s+\d+[a-z]?(?:\(\d+\))?/i)?.[0] || null;
          const actMatch = snippet.match(/\b[A-Za-z][A-Za-z&().,\s-]{3,120}\s(?:Act|Code|Rules?|Regulations?)(?:,\s*\d{4})?\b/)?.[0] || null;
          const caseMatch =
            snippet.match(/\b[A-Za-z][A-Za-z .,&'-]{2,80}\s+v(?:s\.?|\.?)\s+[A-Za-z][A-Za-z .,&'-]{2,80}(?:\s*\(\d{4}\))?/i)?.[0] || null;
          const docRef = String(citation?.doc_id || "").replace(/^legal:/i, "").replace(/[_-]+/g, " ").trim();
          const title = actMatch || caseMatch || docRef || `Authority ${idx + 1}`;
          return {
            title,
            section: sectionMatch,
            snippet: snippet || "Legal corpus excerpt unavailable.",
            sourceLabel: String(citation?.source_label || "Legal Corpus").trim(),
          };
        });
  const courtName = renderInlineText(parseResult.keyFacts?.court_name);
  const caseNumbers = Array.isArray(parseResult.keyFacts?.case_numbers) ? parseResult.keyFacts.case_numbers.filter(Boolean).slice(0, 3) : [];
  const reliefsClaimed = Array.isArray(parseResult.keyFacts?.reliefs_claimed) ? parseResult.keyFacts.reliefs_claimed.filter(Boolean).slice(0, 3) : [];
  const filingStage = renderInlineText(parseResult.keyFacts?.filing_stage);
  const rawDetailedParties = Array.isArray(parseResult.keyFacts?.detailed_parties)
    ? parseResult.keyFacts.detailed_parties
        .map((party: any) => {
          const role = renderInlineText(party?.role);
          const name = formatPartyDisplayName(party?.name);
          return role || name ? `${role}${role && name ? ": " : ""}${name}`.trim() : "";
        })
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const detailedParties = rawDetailedParties.slice(0, 4);
  const extraPartiesCount = Math.max(0, rawDetailedParties.length - detailedParties.length);
  const researchNote = buildGroundedResearchNote(parseResult, hasLegalCorpusContext, citations.length, resolvedInputMode);
  const confidenceNote =
    resolvedInputMode === "prompt_only"
      ? "Confidence score for this query parsing assessment based on the submitted case query and selected filters."
      : resolvedInputMode === "docs_only"
        ? "Confidence score for this query parsing assessment based on uploaded case documents and selected filters."
        : resolvedInputMode === "docs_plus_prompt"
          ? "Confidence score for this query parsing assessment based on the submitted query, uploaded documents, and selected filters."
          : "Confidence score for this query parsing assessment based on the current case context and selected filters.";

  const exportPdfUrl = `${apiClient.baseUrl}/cases/${encodeURIComponent(caseId)}/agents/query-parsing/export.pdf`;

  const openExportPdf = async () => {
    if (!caseId) return;
    await apiClient.download(exportPdfUrl, { filename: `query-parsing-${caseId}.pdf` });
  };

  const shareReport = async () => {
    if (!caseId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const title =
      (typeof (parseResult as any)?.caseTitle === "string" && (parseResult as any).caseTitle.trim()) ||
      caseRecord?.title ||
      "Query Parsing Report";
    setShareBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} - Query Parsing Report`,
          text: "AGENTIC OMNI LAW legal analysis report. Open and use Export PDF to save the report as PDF.",
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard?.writeText(shareUrl);
      window.alert("Share link copied. Open the page and use Export PDF to save/share as PDF.");
    } catch {
      // user cancelled / clipboard unsupported
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div className="p-4 pt-8 md:p-6 md:pt-10 max-w-7xl mx-auto">
      <FadeIn>
        <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AgentReportBackButton
              fallbackHref={`/app/agents/query?caseId=${encodeURIComponent(caseId)}`}
              fallbackLabel="Back to Query Parsing"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setLoading(true);
                setLoadError(null);
                void caseService.fetchCase(caseId).then(setLiveCaseDetails).catch((error) => {
                  setLoadError(error instanceof Error ? error.message : "Unable to refresh query parsing result.");
                }).finally(() => setLoading(false));
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {(typeof (parseResult as any)?.caseTitle === "string" && (parseResult as any).caseTitle.trim()) || liveCaseDetails?.title || caseRecord?.title || "Query Parsing Workspace"}
          </div>
        </div>
        <Card className="p-4 md:p-6 border-border/60 bg-card/90">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Analysis Results</div>
              <h2 className="text-xl md:text-2xl font-bold font-heading">Legal Analysis Report</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void shareReport()} disabled={shareBusy}>
                <Share2 className="h-4 w-4" /> {shareBusy ? "Sharing..." : "Share"}
              </Button>
              <Button size="sm" className="gap-2" onClick={() => void openExportPdf()}>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          <div className="grid xl:grid-cols-[1.6fr_0.9fr] gap-4">
            <div className="space-y-4">
              {submittedQueryText ? (
                <Card className="p-4 border-border/60 bg-muted/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold">Submitted Case Query</h3>
                    <Badge variant="outline">Current Input</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-6 whitespace-pre-wrap break-words">
                    {submittedQueryText}
                  </p>
                </Card>
              ) : uploadedDocs.length > 0 ? (
                <Card className="p-4 border-border/60 bg-muted/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold">Submitted Case Input</h3>
                    <Badge variant="outline">Uploaded Documents</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-6">
                    {inputMode === "docs"
                      ? "No typed query was provided for this run. Query Parsing analyzed the uploaded document(s) attached for this run."
                      : "No typed query was provided. Query Parsing analyzed the uploaded document(s) attached for this run."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {uploadedDocs.slice(0, 6).map((name) => (
                      <Badge key={name} variant="secondary">{name}</Badge>
                    ))}
                    {uploadedDocs.length > 6 ? <Badge variant="outline">+{uploadedDocs.length - 6} more</Badge> : null}
                  </div>
                </Card>
              ) : null}

              <Card className="p-4 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BookOpenText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">Executive Summary</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-6 whitespace-pre-line">{executiveSummaryText}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">Jurisdiction: {renderInlineText(parseResult.jurisdiction || parseResult.jurisdictionGuess, "Auto Detect")}</Badge>
                      {renderInlineText(parseResult.state) ? <Badge variant="outline">State: {renderInlineText(parseResult.state)}</Badge> : null}
                      {!isRejectedNonCase ? <Badge variant="outline">Domain: {renderInlineText(parseResult.legalDomain || parseResult.domain, "General")}</Badge> : null}
                      <Badge variant="outline">
                        Language: {renderInlineText(parseResult.detectedLanguage, "English")}
                        {typeof parseResult.detectedLanguageConfidence === "number" ? ` (${Math.round(parseResult.detectedLanguageConfidence * 100)}%)` : ""}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {courtName || caseNumbers.length > 0 || detailedParties.length > 0 || reliefsClaimed.length > 0 || filingStage ? (
                <Card className="p-4">
                  <h3 className="font-semibold">Case Snapshot</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                    {courtName ? (
                      <div>
                        <div className="text-muted-foreground">Forum / Court</div>
                        <div className="mt-1">{courtName}</div>
                      </div>
                    ) : null}
                    {filingStage ? (
                      <div>
                        <div className="text-muted-foreground">Procedural Posture</div>
                        <div className="mt-1">{filingStage}</div>
                      </div>
                    ) : null}
                    {caseNumbers.length > 0 ? (
                      <div>
                        <div className="text-muted-foreground">Case References</div>
                        <div className="mt-1">{caseNumbers.join(", ")}</div>
                      </div>
                    ) : null}
                    {reliefsClaimed.length > 0 ? (
                      <div>
                        <div className="text-muted-foreground">Relief Sought</div>
                        <div className="mt-1">{reliefsClaimed.join(", ")}</div>
                      </div>
                    ) : null}
                    {detailedParties.length > 0 ? (
                      <div className="md:col-span-2">
                        <div className="text-muted-foreground">Extracted Parties</div>
                        <div className="mt-1">
                          {detailedParties.join(" | ")}
                          {extraPartiesCount > 0 ? ` | +${extraPartiesCount} more` : ""}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ) : null}

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold inline-flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" /> Legal Grounds
                  </h3>
                  <div className="mt-3 space-y-2">
                    {(
                      (parseResult as any).legalGrounds?.length
                        ? (parseResult as any).legalGrounds
                        : parseResult.issueGroups?.length
                        ? (parseResult.issueGroups as QueryIssueGroup[]).map((g: QueryIssueGroup) => g.title)
                        : parseResult.highlights?.length
                          ? parseResult.highlights
                          : ["No specific grounds identified yet."]
                    )
                      .slice(0, 6)
                      .map((item: string) => (
                      <div key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-orange-500" /> Risk Assessment
                  </h3>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Risk Level</span>
                      <Badge variant={parseResult.riskLabel === "High" ? "destructive" : "secondary"}>{renderInlineText(parseResult.riskLabel, "Unknown")}</Badge>
                    </div>
                    {parseResult.keyFacts?.outstanding_amount_inr ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Outstanding Amount</span>
                        <span className="font-medium">₹{Number(parseResult.keyFacts.outstanding_amount_inr).toLocaleString("en-IN")}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Source Scope</span>
                      <span className="font-medium">
                        {(() => {
                          const citations = Array.isArray(parseResult.citations) ? parseResult.citations : [];
                          const labels = new Set(
                            citations
                              .map((c: any) => String(c?.source_label || c?.source_type || "").toUpperCase().trim())
                              .filter(Boolean),
                          );
                          const qa = parseResult.qaDebug || {};
                          const v = qa.input_source_verification || {};
                          if (labels.size > 0) return `${labels.size} source type(s)`;
                          const derived = (v.used_current_input ? 1 : 0) + (v.used_uploaded_docs ? 1 : 0);
                          return `${derived} source type(s)`;
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium">
                        {parseResult.mode === "rag_llm"
                          ? "Advanced AI Analysis"
                          : parseResult.mode === "fallback"
                            ? "Standard Analysis"
                            : "Multilingual + Filtered"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <div className="text-4xl font-bold font-heading text-primary">{confidencePct}%</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {confidenceNote}
                </p>
              </Card>

              {transcriptLines.length > 0 ? (
                <Card className="p-4 border-border/60 bg-card/95">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">Latest Run Activity</h3>
                    <Badge variant="outline">{transcriptLines.length} steps</Badge>
                  </div>
                  <div className="mt-3 space-y-3">
                    {transcriptLines.slice(-5).map((line) => (
                      <div key={line.id} className="rounded-lg border border-border/60 bg-muted/15 px-3 py-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          <span>{line.phase || "Run"}</span>
                          {line.timestamp ? <span className="font-mono tracking-normal normal-case">{line.timestamp}</span> : null}
                        </div>
                        <div className="mt-1 text-sm font-medium text-foreground">
                          {line.actor ? `${line.actor}: ` : ""}{line.text}
                        </div>
                        {line.detail ? <div className="mt-1 text-sm leading-6 text-muted-foreground">{line.detail}</div> : null}
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card className="p-4">
                <h3 className="font-semibold inline-flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" /> Relevant Citations
                </h3>
                {Object.keys(groupedCitations).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(groupedCitations).map(([group, entries]: [string, QueryCitation[]]) => (
                      <div key={group}>
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{formatCitationGroupLabel(group)}</div>
                        <div className="space-y-2">
                          {entries.slice(0, 3).map((citation: QueryCitation, index: number) => (
                            <div key={`${group}-${index}`} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                              <div className="line-clamp-2 text-muted-foreground">{formatCitationSnippet(citation.snippet)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {(parseResult.qaDebug?.input_source_verification?.used_current_input || parseResult.qaDebug?.input_source_verification?.used_uploaded_docs)
                      ? "No grounded citations were returned for this run. Retry or check extraction quality."
                      : "No citations available for this run."}
                  </div>
                )}
              </Card>
            </div>
          </div>

        </Card>

        <Card className="mt-4 p-4 md:p-6 border-border/60 bg-card/90">
          <div className="mb-2">
            <h2 className="text-xl md:text-2xl font-bold font-heading">Legal Research Results</h2>
          </div>
          <Card className="p-4 border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Sparkles className="h-4 w-4" />
              Grounded Research Snapshot
            </div>
              <div className="mt-3 text-sm leading-6 text-muted-foreground space-y-2">
                <p>
                  {researchNote}
                </p>
              {hasLegalCorpusContext ? <p className="text-foreground">{legalResearchSummary}</p> : null}
              {hasLegalCorpusContext && parsedIssuePoints.length > 0 ? (
                <ol className="list-decimal pl-5 space-y-1 text-foreground">
                  {parsedIssuePoints.map((point: string, idx: number) => (
                    <li key={`${idx}-${point.slice(0, 32)}`}>{point}</li>
                  ))}
                </ol>
              ) : null}
              {legalAuthorities.length > 0 ? (
                <div className="pt-1 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Relevant Acts / Case Law</div>
                  <div className="space-y-2">
                    {legalAuthorities.slice(0, 4).map((authority: any, idx: number) => (
                      <div key={`${authority.title}-${idx}`} className="rounded-lg border bg-muted/20 px-3 py-2">
                        <div className="text-sm font-medium text-foreground">
                          {idx + 1}. {authority.title}
                          {authority.section ? <span className="text-muted-foreground"> ({authority.section})</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{authority.snippet}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {citations.length > 0 ? (
                <div className="pt-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Grounded Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {citations.slice(0, 5).map((citation: QueryCitation, idx: number) => (
                      <Badge key={`src-${idx}`} variant="outline">
                        {formatCitationGroupLabel(String(citation.source_label || citation.source_type || "SOURCE"))}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </Card>
      </FadeIn>
    </div>
  );
}

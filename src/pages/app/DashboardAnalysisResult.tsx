import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/lib/magic-ui";
import { EmptyState, LoadingState } from "@/components/app/PageState";
import { apiClient } from "@/services/apiClient";
import { caseService } from "@/services/caseService";
import { legalDraftsService } from "@/services/legalDraftsService";
import { roleAgentsService } from "@/services/roleAgentsService";
import { useAppStore } from "@/store";
import { getRoleAgentsForRole, roleAgentRegistry } from "@/agents/roleAgentRegistry";
import { useI18n } from "@/hooks/useI18n";
import { autoTranslateUiText } from "@/lib/i18n";
import BackButton from "@/components/app/BackButton";
import { ArrowUpRight, Info, Loader2, TriangleAlert } from "lucide-react";

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

type AgentStatus = {
  status?: string;
  run_id?: string | null;
  pct?: number;
  step?: string;
  reason?: string;
};

type CaseDetailsRaw = {
  case_id: string;
  title?: string;
  outputs?: Record<string, any>;
};

type DashboardAnalysisCache = {
  caseId: string;
  runAllId: string;
  savedAt: number;
  details: CaseDetailsRaw | null;
  runAllStatus: { overall_status?: string; agents?: Record<string, AgentStatus> } | null;
  rolePayloads: Record<string, any>;
};

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;
type TranslateUiFn = (value: string) => string;

const DASHBOARD_ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000;

function isTerminalOverallStatus(status?: string) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "done" || normalized === "error" || normalized === "cancelled";
}

function getDashboardAnalysisCacheKey(caseId: string, runAllId: string) {
  return `dashboard-analysis-result:${caseId}:${runAllId || "none"}`;
}

function readDashboardAnalysisCache(caseId: string, runAllId: string): DashboardAnalysisCache | null {
  if (typeof window === "undefined" || !caseId) return null;
  try {
    const raw = window.sessionStorage.getItem(getDashboardAnalysisCacheKey(caseId, runAllId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardAnalysisCache;
    if (!parsed?.details?.case_id) return null;
    if (parsed.caseId !== caseId || parsed.runAllId !== runAllId) return null;
    if (Date.now() - Number(parsed.savedAt || 0) > DASHBOARD_ANALYSIS_CACHE_TTL_MS) return null;
    if (runAllId && !isTerminalOverallStatus(parsed.runAllStatus?.overall_status)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDashboardAnalysisCache(cache: DashboardAnalysisCache) {
  if (typeof window === "undefined" || !cache.caseId || !cache.details?.case_id) return;
  if (cache.runAllId && !isTerminalOverallStatus(cache.runAllStatus?.overall_status)) return;
  try {
    window.sessionStorage.setItem(
      getDashboardAnalysisCacheKey(cache.caseId, cache.runAllId),
      JSON.stringify({
        ...cache,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

function normalizeStatus(raw?: string) {
  const s = String(raw || "").toLowerCase();
  if (s === "done" || s === "cached" || s === "succeeded" || s === "success") return "done";
  if (s === "running" || s === "queued" || s === "pending") return "running";
  if (s === "error" || s === "failed" || s === "blocked") return "error";
  return "queued";
}

function getPayloadForAgent(agentKey: string, outputs: Record<string, any>) {
  if (outputs[agentKey]) return outputs[agentKey];
  if (agentKey === "query_parsing") return outputs.query_parsing || outputs.query_parse || null;
  if (agentKey === "contract_risk_dispute_settlement") return outputs.contract_risk_dispute_settlement || outputs.contract_risk || null;
  if (agentKey === "case_outcome_deadline_penalty") return outputs.case_outcome_deadline_penalty || outputs.outcome_projection || null;
  if (agentKey === "policy_compliance") return outputs.policy_compliance || null;
  if (agentKey === "legal_drafts_validation") return outputs.legal_drafts_validation || outputs.legal_drafts || null;
  return null;
}

function displayValue(value: any, t: TranslateFn) {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : t("common.notAvailable");
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  if (typeof value === "string") return value.trim() || t("common.notAvailable");
  if (value == null) return t("common.notAvailable");
  return String(value);
}

function summarizeObjectEntries(obj: Record<string, any>) {
  const entries = Object.entries(obj || {}).filter(([key, value]) => {
    if (["qa_debug", "debug", "raw", "raw_output", "raw_response", "metadata", "provenance"].includes(String(key || "").toLowerCase())) return false;
    if (value == null || value === "") return false;
    if (Array.isArray(value)) return false;
    if (typeof value === "object") return false;
    return true;
  });
  return entries.slice(0, 8);
}

function isGenericQuerySummary(text: string) {
  const normalized = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return true;
  return [
    "dispute context is connected to",
    "connected to india",
    "key facts indicate facts from the submitted inputs",
    "query has been structured into issue groups",
  ].some((pattern) => normalized.includes(pattern));
}

function buildQueryParsingSummary(payload: any, t: TranslateFn) {
  const direct =
    payload.executive_summary ||
    payload.executiveSummaryText ||
    payload.summary ||
    "";
  const directText = typeof direct === "string" ? direct.trim() : "";
  if (directText && !isGenericQuerySummary(directText)) return directText;

  const keyFacts = payload?.key_facts || payload?.keyFacts || {};
  const factParts = [
    keyFacts.outstanding_amount_inr
      ? t("dashboardAnalysis.queryParsing.amountInIssue", {
          amount: Number(keyFacts.outstanding_amount_inr).toLocaleString("en-IN"),
        })
      : "",
    keyFacts.contract_date
      ? t("dashboardAnalysis.queryParsing.contractDate", { date: String(keyFacts.contract_date) })
      : "",
    keyFacts.payment_terms
      ? t("dashboardAnalysis.queryParsing.paymentTerms", { terms: String(keyFacts.payment_terms) })
      : "",
    keyFacts.delivery_terms
      ? t("dashboardAnalysis.queryParsing.deliveryTerms", { terms: String(keyFacts.delivery_terms) })
      : "",
    keyFacts.delay_days_range
      ? t("dashboardAnalysis.queryParsing.delayWindow", { days: String(keyFacts.delay_days_range) })
      : "",
  ].filter(Boolean);
  const grounds = Array.isArray(payload?.legal_grounds) ? payload.legal_grounds.filter(Boolean).slice(0, 2) : [];
  const domain = String(payload?.legal_domain || payload?.domain?.primary || payload?.domain || "").trim();

  const parts = [
    domain ? t("dashboardAnalysis.queryParsing.domainIdentified", { domain }) : "",
    factParts.length ? factParts.join(". ") + "." : "",
    grounds.length ? t("dashboardAnalysis.queryParsing.likelyIssues", { issues: grounds.join(", ") }) : "",
  ].filter(Boolean);
  return parts.join(" ").trim() || t("dashboardAnalysis.queryParsing.fallback");
}

function buildAgentRoute(
  agentKey: string,
  caseId: string,
  returnTo?: string,
  options?: { openSavedReport?: boolean; runId?: string },
) {
  const openSavedReport = Boolean(options?.openSavedReport);
  const runId = String(options?.runId || "").trim();
  let base =
    agentKey === "query_parsing"
      ? "/app/agents/query/result?caseId=" + encodeURIComponent(caseId)
      : agentKey === "contract_risk_dispute_settlement"
        ? "/app/cases/" + encodeURIComponent(caseId) + "/agents/contract-risk/results"
        : agentKey === "case_outcome_deadline_penalty"
          ? "/app/cases/" + encodeURIComponent(caseId) + "/agents/case-outcome/results"
        : agentKey === "policy_compliance"
          ? "/app/cases/" + encodeURIComponent(caseId) + "/agents/policy-compliance/results"
          : agentKey === "legal_drafts_validation"
              ? "/app/cases/" + encodeURIComponent(caseId) + "/agents/legal-drafts"
              : "/app/cases/" + encodeURIComponent(caseId) + "/agents/role/" + encodeURIComponent(agentKey);
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  if (runId && agentKey === "query_parsing") params.set("runId", runId);
  if (
    openSavedReport &&
    ![
      "query_parsing",
      "contract_risk_dispute_settlement",
      "case_outcome_deadline_penalty",
      "policy_compliance",
      "legal_drafts_validation",
    ].includes(agentKey)
  ) {
    params.set("view", "report");
  }
  const suffix = params.toString();
  if (!suffix) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${suffix}`;
}

async function resolveAgentReportHref(
  agentKey: string,
  caseId: string,
  returnTo?: string,
  options?: { openSavedReport?: boolean; runId?: string; payload?: any },
) {
  if (agentKey !== "legal_drafts_validation") {
    return buildAgentRoute(agentKey, caseId, returnTo, options);
  }
  const safeFallback = buildAgentRoute(agentKey, caseId, returnTo, options);
  try {
    const payloadDraftId = String(options?.payload?.draft_id || "").trim();
    const payloadTemplateKey = String(options?.payload?.template_key || "").trim();
    if (payloadDraftId && payloadTemplateKey) {
      const params = new URLSearchParams();
      if (returnTo) params.set("returnTo", returnTo);
      if (options?.runId) params.set("runId", options.runId);
      const suffix = params.toString();
      const draftHref = `/app/cases/${encodeURIComponent(caseId)}/agents/legal-drafts/${encodeURIComponent(payloadTemplateKey)}/${encodeURIComponent(payloadDraftId)}`;
      return suffix ? `${draftHref}?${suffix}` : draftHref;
    }
    const meta = await legalDraftsService.getMeta(caseId);
    const latestDraft = Array.isArray(meta?.recent_drafts) && meta.recent_drafts.length > 0
      ? meta.recent_drafts[0]
      : null;
    if (!latestDraft?.draft_id || !latestDraft?.template_key) return safeFallback;
    const params = new URLSearchParams();
    if (returnTo) params.set("returnTo", returnTo);
    if (options?.runId) params.set("runId", options.runId);
    const suffix = params.toString();
    const draftHref = `/app/cases/${encodeURIComponent(caseId)}/agents/legal-drafts/${encodeURIComponent(latestDraft.template_key)}/${encodeURIComponent(latestDraft.draft_id)}`;
    return suffix ? `${draftHref}?${suffix}` : draftHref;
  } catch {
    return safeFallback;
  }
}

function getSummary(agentKey: string, payload: any, t: TranslateFn) {
  if (!payload || typeof payload !== "object") return t("dashboardAnalysis.summary.noOutput");
  if (agentKey === "query_parsing") return buildQueryParsingSummary(payload, t);
  const direct =
    payload.executive_summary ||
    payload.executiveSummaryText ||
    payload.summary ||
    payload.reasoning ||
    payload.facts_summary ||
    payload.content;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  if (agentKey === "contract_risk_dispute_settlement") {
    const level = payload?.scores?.risk_level || payload?.risk_level;
    const score = payload?.scores?.overall_risk_score;
    if (level != null || score != null) {
      const scorePart = score != null ? t("dashboardAnalysis.summary.riskScorePart", { score }) : "";
      return t("dashboardAnalysis.summary.riskLevel", {
        level: String(level || t("common.unknown")),
        scorePart,
      });
    }
  }
  if (agentKey === "case_outcome_deadline_penalty") {
    const win = payload?.prediction?.distribution?.win;
    if (typeof win === "number") return t("dashboardAnalysis.summary.winLikelihood", { percent: Math.round(win * 100) });
  }
  if (agentKey === "policy_compliance") {
    const level = payload?.risk_level;
    const score = payload?.overall_score;
    if (level != null || score != null) {
      return t("dashboardAnalysis.summary.complianceScore", {
        score: score ?? t("common.notAvailable"),
        level: String(level || t("common.unknown")),
      });
    }
  }
  if (agentKey === "legal_drafts_validation") {
    if (typeof payload?.title === "string" && payload.title.trim()) return payload.title.trim();
    if (typeof payload?.content === "string" && payload.content.trim()) {
      return t("dashboardAnalysis.summary.completedStructured");
    }
  }
  if (Array.isArray(payload?.recommendations) && payload.recommendations.length) return String(payload.recommendations[0]);
  if (Array.isArray(payload?.legal_grounds) && payload.legal_grounds.length) return String(payload.legal_grounds[0]);
  if (Array.isArray(payload?.highlights) && payload.highlights.length) return String(payload.highlights[0]);
  if (typeof payload?.failure_reason === "string" && payload.failure_reason.trim()) {
    if (agentKey === "policy_compliance" || agentKey === "legal_drafts_validation") {
      return t("dashboardAnalysis.summary.completedStructured");
    }
    return payload.failure_reason.trim();
  }
  if (payload?.analysis_valid === false && payload?.failure_reason) return String(payload.failure_reason);
  return t("dashboardAnalysis.summary.completedStructured");
}

function getStoppedSummary(reason: string | undefined, step: string | undefined, t: TranslateFn) {
  const cleanReason = String(reason || "").trim();
  if (cleanReason) return cleanReason;
  const cleanStep = String(step || "").trim();
  if (cleanStep) return cleanStep;
  return t("dashboardAnalysis.summary.stoppedNoOutput");
}

function hasSavedPayload(payload: any) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.stage === "running") return false;
  if (Array.isArray(payload.sections) && payload.sections.length > 0) return true;
  const keys = Object.keys(payload);
  if (!keys.length) return false;
  return keys.some((k) => payload[k] != null && payload[k] !== "");
}

function isRunningPlaceholderPayload(payload: any) {
  return Boolean(payload && typeof payload === "object" && String(payload.stage || "").toLowerCase() === "running");
}

function isTransientFinalizationReason(reason: unknown) {
  const text = String(reason || "").trim().toLowerCase();
  if (!text) return false;
  return (
    text.includes("background agent exceeded max wait window") ||
    text.includes("finalizing a saved fallback output") ||
    text.includes("waiting for saved output finalization")
  );
}

function hasMeaningfulArray(values: any) {
  return Array.isArray(values) && values.some((item) => String(item || "").trim().length > 0);
}

function isTerminalAgentState(status: string) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "done" || normalized === "error" || normalized === "failed" || normalized === "cancelled" || normalized === "blocked";
}

function areDashboardRowsReady(
  runStatus: { agents?: Record<string, AgentStatus> } | null,
  outputs: Record<string, any>,
  agentKeys: string[],
  t: TranslateFn,
) {
  const agents = runStatus?.agents || {};
  const relevantKeys = agentKeys.filter((key) => agents[key]);
  if (!relevantKeys.length) return false;
  return relevantKeys.every((key) => {
    const agent = agents[key];
    const status = String(agent?.status || "").toLowerCase();
    if (!isTerminalAgentState(status)) return false;
    const payload = getPayloadForAgent(key, outputs);
    if (status === "done") return isRenderablePayload(key, payload, t);
    return Boolean(String(agent?.reason || agent?.step || payload?.failure_reason || "").trim()) || hasSavedPayload(payload);
  });
}

function countRenderableDashboardRows(
  runStatus: { agents?: Record<string, AgentStatus> } | null,
  outputs: Record<string, any>,
  agentKeys: string[],
  t: TranslateFn,
) {
  const agents = runStatus?.agents || {};
  const relevantKeys = agentKeys.filter((key) => agents[key]);
  return relevantKeys.reduce((count, key) => {
    const agent = agents[key];
    const status = String(agent?.status || "").toLowerCase();
    if (!isTerminalAgentState(status)) return count;
    const payload = getPayloadForAgent(key, outputs);
    if (status === "done") return isRenderablePayload(key, payload, t) ? count + 1 : count;
    return Boolean(String(agent?.reason || agent?.step || payload?.failure_reason || "").trim()) || hasSavedPayload(payload)
      ? count + 1
      : count;
  }, 0);
}

function isRenderablePayload(agentKey: string, payload: any, t: TranslateFn) {
  if (!hasSavedPayload(payload)) return false;
  if (getCitationsCount(payload) > 0) return true;
  if (agentKey in roleAgentRegistry) {
    if (Array.isArray(payload?.sections) && payload.sections.length > 0) return true;
    if (hasMeaningfulArray(payload?.clarifying_questions)) return true;
    const roleDirect =
      payload?.executive_summary ||
      payload?.summary ||
      payload?.reasoning ||
      payload?.content ||
      payload?.failure_reason;
    return typeof roleDirect === "string" && roleDirect.trim().length > 0;
  }
  if (agentKey === "query_parsing") {
    const summary = buildQueryParsingSummary(payload, t);
    if (summary && summary !== t("dashboardAnalysis.queryParsing.fallback")) return true;
    if (hasMeaningfulArray(payload?.legal_grounds) || hasMeaningfulArray(payload?.issue_groups) || hasMeaningfulArray(payload?.highlights)) return true;
  }
  if (agentKey === "contract_risk_dispute_settlement") {
    if (payload?.scores?.risk_level || payload?.risk_level || typeof payload?.scores?.overall_risk_score === "number") return true;
    if (hasMeaningfulArray(payload?.high_risk_clauses) || hasMeaningfulArray(payload?.medium_risk_clauses) || hasMeaningfulArray(payload?.recommendations)) return true;
  }
  if (agentKey === "case_outcome_deadline_penalty") {
    if (typeof payload?.prediction?.distribution?.win === "number") return true;
    if (hasMeaningfulArray(payload?.recommendations) || hasMeaningfulArray(payload?.legal_grounds) || hasMeaningfulArray(payload?.next_actions)) return true;
  }
  if (agentKey === "policy_compliance") {
    if (payload?.risk_level || typeof payload?.overall_score === "number") return true;
    if (hasMeaningfulArray(payload?.recommendations) || hasMeaningfulArray(payload?.frameworks) || hasMeaningfulArray(payload?.findings)) return true;
  }
  if (agentKey === "legal_drafts_validation") {
    if (typeof payload?.title === "string" && payload.title.trim()) return true;
    if (typeof payload?.content === "string" && payload.content.trim()) return true;
  }
  const direct =
    payload?.executive_summary ||
    payload?.executiveSummaryText ||
    payload?.summary ||
    payload?.reasoning ||
    payload?.facts_summary ||
    payload?.content;
  return typeof direct === "string" && direct.trim().length > 0;
}

function shouldTreatPayloadAsWarning(agentKey: string, payload: any, renderablePayload: boolean) {
  if (!payload || typeof payload !== "object") return false;
  if (agentKey === "legal_drafts_validation") {
    return !renderablePayload && (payload?.analysis_valid === false || payload?.mode === "fallback" || Boolean(String(payload?.failure_reason || "").trim()));
  }
  return Boolean(payload?.analysis_valid === false && payload?.failure_reason && !renderablePayload);
}

function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function summarizePreviewPoints(payload: any) {
  if (!payload || typeof payload !== "object") return [];
  const lists = [
    payload.recommendations,
    payload.next_actions,
    payload.legal_grounds,
    payload.highlights,
    payload.missing_information_questions,
  ].find((value) => Array.isArray(value) && value.length > 0);
  if (Array.isArray(lists)) {
    return lists.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3);
  }
  return [];
}

function renderCompactPreview(payload: any, t: TranslateFn, translateUi: TranslateUiFn) {
  if (!payload || typeof payload !== "object") {
    return <p className="text-sm text-muted-foreground">{t("dashboardAnalysis.noPreview")}</p>;
  }

  const primitiveEntries = summarizeObjectEntries(payload).slice(0, 4);
  const previewPoints = summarizePreviewPoints(payload);

  return (
    <div className="space-y-3">
      {primitiveEntries.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {primitiveEntries.map(([key, value]: [string, any]) => (
            <div key={key} className="rounded-xl border border-border/60 bg-background/35 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{translateUi(toTitleCase(key))}</div>
              <div className="mt-1 text-sm text-foreground/95 break-words">{displayValue(value, t)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {previewPoints.length ? (
        <div className="rounded-xl border border-border/60 bg-background/35 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("dashboardAnalysis.keyPoints")}</div>
          <ul className="mt-2 space-y-2">
            {previewPoints.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-foreground/95">
                <span className="mt-[3px] text-primary">-</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!primitiveEntries.length && !previewPoints.length ? (
        <p className="text-sm text-muted-foreground">{t("dashboardAnalysis.openAgentReportHint")}</p>
      ) : null}
    </div>
  );
}

function getCitationsCount(payload: any) {
  if (!payload || typeof payload !== "object") return 0;
  if (Array.isArray(payload.citations)) return payload.citations.length;
  return 0;
}

export default function DashboardAnalysisResult() {
  const [, setLocation] = useLocation();
  const selectedRole = useAppStore((s) => s.selectedRole);
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);
  const { t, language } = useI18n();
  const translateUi = (value: string) => autoTranslateUiText(value, language);
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const caseId = params.get("caseId") || "";
  const runAllId = params.get("runAllId") || "";
  const [cacheSeed] = useState<DashboardAnalysisCache | null>(() => readDashboardAnalysisCache(caseId, runAllId));
  const [loading, setLoading] = useState(!cacheSeed?.details);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<CaseDetailsRaw | null>(cacheSeed?.details || null);
  const [runAllStatus, setRunAllStatus] = useState<{ overall_status?: string; agents?: Record<string, AgentStatus> } | null>(
    cacheSeed?.runAllStatus || null,
  );
  const [expandedByAgent, setExpandedByAgent] = useState<Record<string, boolean>>({});
  const [rolePayloads, setRolePayloads] = useState<Record<string, any>>(cacheSeed?.rolePayloads || {});
  const [syncingRolePayloads, setSyncingRolePayloads] = useState<Record<string, boolean>>({});
  const returnTo = useMemo(() => {
    const next = new URLSearchParams();
    next.set("caseId", caseId);
    if (runAllId) next.set("runAllId", runAllId);
    return `/app/dashboard/analysis/result?${next.toString()}`;
  }, [caseId, runAllId]);
  const allowedRoleAgentKeys = useMemo(
    () => getRoleAgentsForRole(selectedRole).map((a) => a.agent_key).sort(),
    [selectedRole],
  );
  const allowedRoleAgentKeySet = useMemo(
    () => new Set(allowedRoleAgentKeys),
    [allowedRoleAgentKeys],
  );

  const roleAgentKeys = useMemo(
    () => {
      const runtimeKeys = new Set<string>();
      Object.keys(runAllStatus?.agents || {}).forEach((key) => {
        if (key in roleAgentRegistry && allowedRoleAgentKeySet.has(key as any)) runtimeKeys.add(key);
      });
      Object.keys(details?.outputs || {}).forEach((key) => {
        if (key in roleAgentRegistry && allowedRoleAgentKeySet.has(key as any)) runtimeKeys.add(key);
      });
      Object.keys(rolePayloads || {}).forEach((key) => {
        if (key in roleAgentRegistry && allowedRoleAgentKeySet.has(key as any)) runtimeKeys.add(key);
      });
      if (runtimeKeys.size > 0) return Array.from(runtimeKeys).sort();
      return allowedRoleAgentKeys;
    },
    [allowedRoleAgentKeySet, allowedRoleAgentKeys, details?.outputs, rolePayloads, runAllStatus?.agents],
  );
  const allAgentKeys = useMemo(
    () => [...COMMON_AGENT_ORDER, ...roleAgentKeys],
    [roleAgentKeys],
  );
  const missingTerminalRoleAgents = useMemo(
    () => roleAgentKeys.filter((agentKey) => {
      const runState = String(runAllStatus?.agents?.[agentKey]?.status || "").toLowerCase();
      return (
        (runState === "done" || runState === "error" || runState === "failed") &&
        !hasSavedPayload(rolePayloads[agentKey]) &&
        !syncingRolePayloads[agentKey]
      );
    }),
    [roleAgentKeys, rolePayloads, runAllStatus?.agents, syncingRolePayloads],
  );
  const missingTerminalRoleAgentsKey = useMemo(
    () => missingTerminalRoleAgents.join("|"),
    [missingTerminalRoleAgents],
  );

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!caseId) {
        setError(t("dashboardAnalysis.missingCase"));
        setLoading(false);
        return;
      }
      if (!details) setLoading(true);
      setError(null);
      try {
        const deadline = Date.now() + (runAllId ? 45_000 : 5_000);
        let lastHydratedCase: CaseDetailsRaw | null = details;
        let lastRunStatus: { overall_status?: string; agents?: Record<string, AgentStatus> } | null = runAllStatus;
        let mergedRolePayloads: Record<string, any> = { ...rolePayloads };
        while (!cancelled) {
          const [caseResp, runResp] = await Promise.all([
            apiClient.get<CaseDetailsRaw>(`/cases/${encodeURIComponent(caseId)}`),
            runAllId
              ? caseService.getRunAllStatus(caseId, runAllId).catch(() => null)
              : Promise.resolve(null),
          ]);
          if (cancelled) return;
          lastHydratedCase = caseResp;
          lastRunStatus = runResp as any;
          setDetails(caseResp);
          setRunAllStatus(runResp as any);
          if (caseResp?.title) setCaseWorkspace(caseId, caseResp.title);
          const roleKeysToHydrate = allowedRoleAgentKeys.filter((agentKey) => {
            const runState = String((runResp as any)?.agents?.[agentKey]?.status || "").toLowerCase();
            return runState === "done" || runState === "error" || runState === "failed";
          });
          let mergedOutputsForReadiness = { ...(caseResp?.outputs || {}) } as Record<string, any>;
          if (roleKeysToHydrate.length) {
            const hydratedEntries = await Promise.all(
              roleKeysToHydrate.map(async (agentKey) => {
                try {
                  const payload = await roleAgentsService.getOutput(caseId, agentKey);
                  return [agentKey, payload] as const;
                } catch {
                  try {
                    const meta: any = await roleAgentsService.getMeta(caseId, agentKey);
                    const fallbackPayload = meta?.latest?.output || null;
                    return [agentKey, isRunningPlaceholderPayload(fallbackPayload) ? null : fallbackPayload] as const;
                  } catch {
                    return [agentKey, null] as const;
                  }
                }
              }),
            );
            if (!cancelled) {
              setRolePayloads((prev) => {
                const next = { ...prev };
                for (const [agentKey, payload] of hydratedEntries) {
                  if (payload) {
                    next[agentKey] = payload;
                    mergedOutputsForReadiness[agentKey] = payload;
                  }
                }
                mergedRolePayloads = next;
                return next;
              });
            }
          }
          const shouldWaitForReadyRows =
            Boolean(runAllId) &&
            String((runResp as any)?.overall_status || "").toLowerCase() === "done" &&
            !areDashboardRowsReady(runResp as any, mergedOutputsForReadiness, [...COMMON_AGENT_ORDER, ...allowedRoleAgentKeys], t) &&
            countRenderableDashboardRows(runResp as any, mergedOutputsForReadiness, [...COMMON_AGENT_ORDER, ...allowedRoleAgentKeys], t) < Math.max(2, [...COMMON_AGENT_ORDER, ...allowedRoleAgentKeys].length - 1);
          if (!shouldWaitForReadyRows) break;
          if (Date.now() >= deadline) break;
          await new Promise((resolve) => window.setTimeout(resolve, 700));
        }
        if (!cancelled && lastHydratedCase?.case_id) {
          writeDashboardAnalysisCache({
            caseId,
            runAllId,
            savedAt: Date.now(),
            details: lastHydratedCase,
            runAllStatus: lastRunStatus,
            rolePayloads: mergedRolePayloads,
          });
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("dashboardAnalysis.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [allowedRoleAgentKeys, caseId, runAllId, setCaseWorkspace, t]);

  useEffect(() => {
    if (!caseId || !runAllStatus?.agents) return;
    if (!missingTerminalRoleAgents.length) return;

    let cancelled = false;
    const loadMissingPayloads = async () => {
      setSyncingRolePayloads((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const key of missingTerminalRoleAgents) {
          if (!next[key]) {
            next[key] = true;
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      const fetchWithRetry = async (agentKey: string) => {
        let lastPayload: any = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            lastPayload = await roleAgentsService.getOutput(caseId, agentKey);
            if (hasSavedPayload(lastPayload)) return lastPayload;
          } catch {
            try {
              const meta: any = await roleAgentsService.getMeta(caseId, agentKey);
              const fallbackPayload = meta?.latest?.output || null;
              lastPayload = isRunningPlaceholderPayload(fallbackPayload) ? lastPayload : (fallbackPayload || lastPayload);
              if (hasSavedPayload(lastPayload)) return lastPayload;
            } catch {
              // retry
            }
          }
          await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
        }

        try {
          await roleAgentsService.startRun(caseId, agentKey, { force: true });
          for (let attempt = 0; attempt < 6; attempt += 1) {
            try {
              lastPayload = await roleAgentsService.getOutput(caseId, agentKey);
              if (hasSavedPayload(lastPayload)) return lastPayload;
            } catch {
              try {
                const meta: any = await roleAgentsService.getMeta(caseId, agentKey);
                const fallbackPayload = meta?.latest?.output || null;
                lastPayload = isRunningPlaceholderPayload(fallbackPayload) ? lastPayload : (fallbackPayload || lastPayload);
                if (hasSavedPayload(lastPayload)) return lastPayload;
              } catch {
                // keep polling recovery output
              }
            }
            await new Promise((resolve) => window.setTimeout(resolve, 600 * (attempt + 1)));
          }
        } catch {
          // Leave the row unresolved; the caller will decide whether to keep warning state.
        }

        return lastPayload;
      };

      const loaded = await Promise.all(
        missingTerminalRoleAgents.map(async (agentKey) => [agentKey, await fetchWithRetry(agentKey)] as const),
      );
      if (cancelled) return;

      setRolePayloads((prev) => {
        const next = { ...prev };
        for (const [agentKey, payload] of loaded) {
          if (hasSavedPayload(payload)) next[agentKey] = payload;
        }
        return next;
      });
      setSyncingRolePayloads((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [agentKey] of loaded) {
          if (next[agentKey]) {
            next[agentKey] = false;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    void loadMissingPayloads();
    return () => {
      cancelled = true;
    };
  }, [caseId, missingTerminalRoleAgents, missingTerminalRoleAgentsKey, runAllStatus?.agents]);

  useEffect(() => {
    if (!caseId || !details?.case_id) return;
    writeDashboardAnalysisCache({
      caseId,
      runAllId,
      savedAt: Date.now(),
      details,
      runAllStatus,
      rolePayloads,
    });
  }, [caseId, details, rolePayloads, runAllId, runAllStatus]);

  useEffect(() => {
    if (!runAllId || !caseId || loading) return;
    const overall = String(runAllStatus?.overall_status || "").toLowerCase();
    if (!overall || overall === "done" || overall === "error" || overall === "cancelled") return;
    setLocation(
      `/app/dashboard/analysis/loading?caseId=${encodeURIComponent(caseId)}&runAllId=${encodeURIComponent(runAllId)}`,
      { replace: true } as any,
    );
  }, [caseId, loading, runAllId, runAllStatus?.overall_status, setLocation]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <LoadingState title={t("dashboardAnalysis.loadingTitle")} description={t("dashboardAnalysis.loadingDescription")} />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <EmptyState
          title={t("dashboardAnalysis.unavailableTitle")}
          description={error || t("dashboardAnalysis.unavailableDescription")}
          actionLabel={t("dashboardRun.backToDashboard")}
          onAction={() => setLocation("/app/dashboard")}
        />
      </div>
    );
  }

  const outputs = details.outputs || {};
  const overallTerminal = isTerminalOverallStatus(runAllStatus?.overall_status);
  const rows = allAgentKeys.map((agentKey) => {
    const statusFromRun = runAllStatus?.agents?.[agentKey];
    const isRoleAgent = Boolean(roleAgentRegistry[agentKey as keyof typeof roleAgentRegistry]);
    const payload = rolePayloads[agentKey] || getPayloadForAgent(agentKey, outputs);
    const hasPayload = hasSavedPayload(payload);
    const isSyncingRolePayload = Boolean(syncingRolePayloads[agentKey]) && !hasPayload;
    const effectiveRunStatus =
      overallTerminal && isRoleAgent && isRunningPlaceholderPayload(payload)
        ? "done"
        : (statusFromRun?.status || "queued");
    const renderablePayload = isRenderablePayload(agentKey, payload, t);
    const stoppedReason =
      (typeof payload?.failure_reason === "string" && payload.failure_reason.trim()) ||
      (typeof statusFromRun?.reason === "string" && statusFromRun.reason.trim()) ||
      "";
    const missingSavedOutput =
      !hasPayload &&
      String(effectiveRunStatus || "").toLowerCase() === "done" &&
      overallTerminal;
    const baseStatus = hasPayload
      ? (shouldTreatPayloadAsWarning(agentKey, payload, renderablePayload) ? "error" : "done")
      : (isRoleAgent && missingSavedOutput)
        ? "running"
        : missingSavedOutput
        ? "error"
        : normalizeStatus(effectiveRunStatus);
    const status = isSyncingRolePayload ? "running" : baseStatus;
    const previewSyncing = isSyncingRolePayload || (!overallTerminal && !hasPayload && status === "done" && isRoleAgent);
    const stopped = !isSyncingRolePayload && !hasPayload && status === "error";
    const runId =
      (typeof statusFromRun?.run_id === "string" && statusFromRun.run_id) ||
      (typeof payload?.run_id === "string" && payload.run_id) ||
      (typeof payload?.provenance?.run_id === "string" && payload.provenance.run_id) ||
      "";
    const displayReason =
      (hasPayload || status === "done") && isTransientFinalizationReason(statusFromRun?.reason)
        ? undefined
        : statusFromRun?.reason;

    return {
      agentKey,
      title: translateUi(AGENT_LABELS[agentKey] || agentKey.replaceAll("_", " ")),
      status,
      previewSyncing,
      stopped,
      pct: statusFromRun?.pct,
      reason: displayReason,
      step: statusFromRun?.step,
      summary: stopped ? getStoppedSummary(stoppedReason, statusFromRun?.step, t) : getSummary(agentKey, payload, t),
      citations: getCitationsCount(payload),
      payload,
      hasPayload,
      runId,
    };
  });

  const doneCount = rows.filter((r) => r.status === "done" && !r.previewSyncing).length;
  const errCount = rows.filter((r) => r.status === "error").length;
  const runningCount = rows.filter((r) => r.status === "running" || r.previewSyncing).length;
  const overallStillRunning = Boolean(runAllId) && !isTerminalOverallStatus(runAllStatus?.overall_status);
  const shouldReturnToLiveRun = overallStillRunning && doneCount === 0 && errCount === 0;

  if (shouldReturnToLiveRun) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <LoadingState
          title={t("dashboardRun.title")}
          description="Final report is not ready yet. Staying on the report page while the latest outputs are hydrated."
        />
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 md:p-6 md:pt-10 max-w-7xl mx-auto">
      <FadeIn>
        <Card className="p-5 md:p-6 border-border/70 bg-card/90">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <BackButton fallbackHref="/app/dashboard" label={t("dashboardRun.backToDashboard")} disableHistory />
              <Button onClick={() => setLocation(`/app/cases/${encodeURIComponent(caseId)}`)}>{t("dashboard.openWorkspace")}</Button>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("dashboardAnalysis.eyebrow")}</div>
              <h2 className="text-2xl md:text-3xl font-bold font-heading mt-1">{t("dashboardAnalysis.title")}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dashboardAnalysis.caseLabel", { value: details.title || caseId })}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-5">
            <Card className="p-3 border-border/60">
              <div className="text-xs text-muted-foreground">{t("run.completed")}</div>
              <div className="text-2xl font-semibold">{doneCount}</div>
            </Card>
            <Card className="p-3 border-border/60">
              <div className="text-xs text-muted-foreground">{t("dashboardAnalysis.inProgress")}</div>
              <div className="text-2xl font-semibold">{runningCount}</div>
            </Card>
            <Card className="p-3 border-border/60">
              <div className="text-xs text-muted-foreground">{t("dashboardAnalysis.warningsFailed")}</div>
              <div className="text-2xl font-semibold">{errCount}</div>
            </Card>
          </div>

          <div className="mt-5 space-y-3">
            {rows.map((row) => (
              <Card key={row.agentKey} className="p-4 border-border/60">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{row.title}</h3>
                    {row.status === "done" && !row.previewSyncing ? <Badge variant="secondary">{t("dashboardAnalysis.status.succeeded")}</Badge> : null}
                    {row.status === "running" || row.previewSyncing ? <Badge variant="outline">{row.previewSyncing ? "Syncing" : t("dashboardAnalysis.status.running")}</Badge> : null}
                    {row.status === "error" ? (
                      row.stopped
                        ? <Badge variant="outline">{t("dashboardAnalysis.status.stopped")}</Badge>
                        : <Badge variant="destructive">{t("dashboardAnalysis.status.needsReview")}</Badge>
                    ) : null}
                    {typeof row.citations === "number" && row.citations > 0 ? (
                      <Badge variant="outline">
                        {row.citations === 1
                          ? t("dashboardAnalysis.citation", { count: row.citations })
                          : t("dashboardAnalysis.citations", { count: row.citations })}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-6 line-clamp-3">
                    {row.summary}
                  </p>
                  <div className="mt-2 text-xs text-emerald-400">{t("dashboardAnalysis.savedHistory")}</div>
                  {row.reason ? (
                    <div
                      className={`mt-2 text-xs inline-flex items-center gap-1 ${
                        row.status === "done"
                          ? "text-muted-foreground"
                          : row.stopped
                            ? "text-muted-foreground"
                            : "text-destructive"
                      }`}
                    >
                      {row.status === "done" ? (
                        <Info className="h-3.5 w-3.5" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5" />
                      )}
                      {row.reason}
                    </div>
                  ) : null}
                    {row.status === "running" && row.step ? (
                      <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {row.step}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        void resolveAgentReportHref(row.agentKey, caseId, returnTo, {
                          openSavedReport: row.hasPayload || row.status === "done",
                          runId: row.runId,
                          payload: row.payload,
                        }).then((href) => setLocation(href));
                      }}
                    >
                      {t("dashboardAnalysis.openAgentReport")}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>

                    {row.hasPayload ? (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() =>
                          setExpandedByAgent((prev) => ({ ...prev, [row.agentKey]: !(prev[row.agentKey] ?? false) }))
                        }
                      >
                        {(expandedByAgent[row.agentKey] ?? false)
                          ? t("dashboardAnalysis.hidePreview")
                          : t("dashboardAnalysis.showPreview")}
                      </Button>
                    ) : (
                      <Button variant="outline" className="gap-2" disabled>
                        {row.previewSyncing
                          ? "Syncing preview"
                          : row.status === "error"
                          ? (row.stopped
                              ? t("dashboardAnalysis.status.stoppedWithReason")
                              : t("dashboardAnalysis.status.completedWithWarning"))
                          : row.status === "done"
                            ? "Preview unavailable"
                            : t("dashboardAnalysis.status.processing")}
                        {row.previewSyncing || row.status === "running"
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : row.status === "error"
                            ? <TriangleAlert className="h-4 w-4" />
                            : null}
                      </Button>
                    )}
                  </div>
                </div>

                {(expandedByAgent[row.agentKey] ?? false) ? (
                  <div className="mt-4 border-t border-border/60 pt-4">
                    {renderCompactPreview(row.payload, t, translateUi)}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

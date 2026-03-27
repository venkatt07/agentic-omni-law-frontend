import { useAppStore, type CaseOutputs } from "@/store";
import { apiClient } from "./apiClient";
import { runService, type RunStatusResponse } from "./runService";

interface QueryParseFilters {
  jurisdiction: string;
  legalDomain: string;
  dateRange: string;
  sourceTypes: string[];
}

export interface QueryParseResult {
  caseTitle?: string;
  summary: string;
  executiveSummaryText?: string;
  mode?: "rag_llm" | "fallback" | string;
  analysisValid?: boolean;
  rejectedInput?: boolean;
  outputMode?: string;
  domain: string;
  legalDomain?: string;
  caseType?: string | null;
  riskLabel: "Low" | "Medium" | "High";
  highlights: string[];
  issueGroups?: Array<{ title: string; description: string; priority: "high" | "medium" | "low" }>;
  legalGrounds?: string[];
  keyFacts?: Record<string, any>;
  evidenceAvailable?: string[];
  requestedOutcomes?: string[];
  detectedLanguage?: string;
  detectedLanguageCode?: string;
  detectedLanguageConfidence?: number;
  filtersSupported?: any;
  filtersApplied?: any;
  confidence?: number;
  confidenceScore?: number;
  jurisdictionGuess?: string;
  jurisdiction?: string | null;
  state?: string | null;
  citations?: Array<{ doc_id?: string; chunk_id?: string; snippet?: string; source_type?: string; source_label?: string }>;
  legalResearchAuthorities?: Array<{
    title: string;
    section?: string | null;
    authorityType?: "act" | "case_law" | "regulation" | "legal_opinion";
    relevance?: string;
    source?: "rag" | "llm";
    confidence?: number;
  }>;
  inputHash?: string;
  provenance?: {
    case_id?: string;
    run_id?: string | null;
    input_hash?: string;
    doc_checksums_used?: string[];
    generated_at?: string;
    model_profile?: string;
  };
  runId?: string;
  qaDebug?: any;
}

type RunAllResult = Required<CaseOutputs>;

export interface CaseDetailsResponse {
  case_id: string;
  title?: string;
  created_at?: string;
  primary_doc_id?: string | null;
  domain_primary?: string | null;
  domain_subtype?: string | null;
  language?: string;
  detectedLanguage?: string;
  filtersApplied?: any;
  agent_status?: Record<string, { state: string; updated_at: string }>;
  documents: Array<{ doc_id: string; name: string; type: string; size: number; created_at: string; detectedLanguage?: string }>;
  outputs: Record<string, any>;
  final_summary?: any;
}
export interface CaseSummaryResponse {
  case_id: string;
  title: string;
  domain: string;
  domain_primary?: string | null;
  domain_subtype?: string | null;
  status?: string;
  updated_at: string;
  last_run_status: string | null;
  run_count?: number;
  successful_run_count?: number;
  query_parsing_rejected?: boolean;
}

function isPlaceholderAuthorityValue(value: unknown) {
  const normalized = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  return normalized === "string" || normalized === "string|null" || normalized === "null" || normalized === "undefined";
}
interface QueryParsingStatsResponse {
  analyzed_cases: number;
  analyzed_unique_cases?: number;
  total_runs: number;
  successful_runs: number;
  success_rate: number;
}

interface DashboardStatsResponse {
  active_contracts: number;
  active_contracts_delta_week: number;
  high_risk_cases: number;
  high_risk_delta_week: number;
  compliance_score: number;
  compliance_delta_month: number;
  resolution_rate: number;
  resolution_delta_month: number;
}

export interface RunAllAggregateStatus {
  run_all_id: string;
  case_id: string;
  doc_hash: string;
  overall_status: "running" | "done" | "error" | "cancelled";
  agents: Record<string, { status: string; run_id?: string | null; pct?: number; step?: string; updated_at?: string; reason?: string }>;
  activity?: Array<{
    id: string;
    timestamp: string;
    actor?: string;
    phase?: string;
    text: string;
    detail?: string;
    next?: string;
    tone?: "neutral" | "live" | "success" | "error";
  }>;
}

export interface SearchResultItem {
  id: string;
  title: string;
  type: "Case" | "Document" | "Agent";
  href: string;
  subtitle?: string;
}

const apiFallbackEnabled = String(import.meta.env.VITE_ENABLE_API_FALLBACK_MOCKS ?? "false") === "true";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const QUERY_STATS_TIME_KEY = "query_parse_last_run_ms";
const CASE_LIST_CACHE_TTL_MS = 20_000;
const CASE_DETAILS_CACHE_TTL_MS = 20_000;
const CASE_SEARCH_CACHE_TTL_MS = 15_000;
const QUERY_PARSE_MAX_POLL_ATTEMPTS = 320;
const QUERY_PARSE_POLL_DELAY_MS = 450;

let caseListCache:
  | {
      value: CaseSummaryResponse[];
      expiresAt: number;
    }
  | null = null;
const caseDetailsCache = new Map<
  string,
  {
    value: CaseDetailsResponse;
    expiresAt: number;
  }
>();
const caseSearchCache = new Map<
  string,
  {
    value: SearchResultItem[];
    expiresAt: number;
  }
>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTransientFetchError = (error: unknown) =>
  error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message);

async function withTransientRetry<T>(fn: () => Promise<T>, attempts = 2, baseDelayMs = 350): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientFetchError(error) || i === attempts) break;
      await delay(baseDelayMs * (i + 1));
    }
  }
  throw lastError;
}

export function mapQueryParse(payload: any): QueryParseResult {
  const structuredDomain = payload?.domain && typeof payload.domain === "object" ? payload.domain : null;
  const structuredJurisdiction = payload?.jurisdiction && typeof payload.jurisdiction === "object" ? payload.jurisdiction : null;
  const structuredLanguage = payload?.language && typeof payload.language === "object" ? payload.language : null;
  const structuredIssueGroups = Array.isArray(payload?.issue_groups) && payload.issue_groups.every((g: any) => g && typeof g.label === "string")
    ? payload.issue_groups
    : null;
  const legacyIssueGroups = Array.isArray(payload?.issue_groups) ? payload.issue_groups : [];
  const issueGroupsNormalized = structuredIssueGroups
    ? structuredIssueGroups.map((g: any) => ({
        title: String(g.label || "").trim(),
        description: "",
        priority: (typeof g.confidence === "number" && g.confidence >= 0.8) ? "high" : (typeof g.confidence === "number" && g.confidence >= 0.6) ? "medium" : "low",
      }))
    : legacyIssueGroups;
  const structuredCitations = Array.isArray(payload?.citations) && payload.citations.every((c: any) => c && (c.source_type === "current_input" || c.source_type === "user_doc"))
    ? payload.citations
    : null;
  const risk = payload?.risk_level || payload?.riskLabel || payload?.risk_level_label;
  const riskLabel: "Low" | "Medium" | "High" =
    (payload?.risk_assessment?.risk_level === "High" || payload?.risk_assessment?.risk_level === "Medium" || payload?.risk_assessment?.risk_level === "Low")
      ? payload.risk_assessment.risk_level
      : risk === "High" || risk === "Medium" || risk === "Low"
      ? risk
      : (payload?.issues?.length ?? 0) > 3
        ? "Medium"
        : "Low";
  const codeToLabel: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    ta: "Tamil",
    te: "Telugu",
    bn: "Bengali",
  };
  const detectedLangObj =
    payload?.detected_language && typeof payload.detected_language === "object" ? payload.detected_language : null;
  const detectedLanguageLabel =
    typeof structuredLanguage?.detected === "string"
      ? structuredLanguage.detected
      :
    typeof payload?.detected_language === "string"
      ? payload.detected_language
      : codeToLabel[String(detectedLangObj?.code || "").toLowerCase()] || detectedLangObj?.name || detectedLangObj?.code || undefined;
  const executiveSummary = payload?.executive_summary || payload?.executive_summary_text || payload?.summary || "Query parsed.";
  return {
    caseTitle: typeof payload?.case_title === "string" ? payload.case_title : undefined,
    mode: payload?.mode,
    analysisValid: typeof payload?.analysis_valid === "boolean" ? payload.analysis_valid : undefined,
    rejectedInput:
      typeof payload?.rejected_input === "boolean"
        ? payload.rejected_input
        : String(payload?.rejected_input || "").toLowerCase() === "true",
    outputMode: typeof payload?.output_mode === "string" ? payload.output_mode : undefined,
    summary: executiveSummary,
    executiveSummaryText: executiveSummary,
    domain: (typeof structuredDomain?.primary === "string" ? structuredDomain.primary : null) || payload?.legal_domain || (typeof payload?.domain === "string" ? payload.domain : null) || "General",
    legalDomain: payload?.legal_domain || (typeof structuredDomain?.primary === "string" ? structuredDomain.primary : null) || (typeof payload?.domain === "string" ? payload.domain : null) || "General",
    caseType: payload?.case_type ?? null,
    riskLabel,
    highlights:
      payload?.highlights ||
      (issueGroupsNormalized.length ? issueGroupsNormalized.map((g: any) => g?.title).filter(Boolean) : null) ||
      payload?.issues ||
      payload?.suggested_topics ||
      [],
    issueGroups: issueGroupsNormalized,
    legalGrounds: Array.isArray(payload?.legal_grounds) ? payload.legal_grounds.filter(Boolean) : [],
    keyFacts: payload?.key_facts || {},
    evidenceAvailable: Array.isArray(payload?.evidence_available) ? payload.evidence_available : [],
    requestedOutcomes: Array.isArray(payload?.requested_outcomes) ? payload.requested_outcomes : Array.isArray(payload?.key_facts?.requested_outcome) ? payload.key_facts.requested_outcome : [],
    detectedLanguage: detectedLanguageLabel,
    detectedLanguageCode: detectedLangObj?.code,
    detectedLanguageConfidence:
      typeof structuredLanguage?.confidence === "number"
        ? structuredLanguage.confidence
        : typeof detectedLangObj?.confidence === "number"
          ? detectedLangObj.confidence
          : undefined,
    filtersSupported: payload?.filters_supported,
    filtersApplied: payload?.filters_applied,
    confidence:
      typeof payload?.confidence === "number"
        ? payload.confidence
        : typeof payload?.confidence_score === "number"
          ? payload.confidence_score / 100
          : undefined,
    confidenceScore: typeof payload?.confidence_score === "number" ? payload.confidence_score : undefined,
    jurisdictionGuess: payload?.jurisdiction_guess || structuredJurisdiction?.country || (typeof payload?.jurisdiction === "string" ? payload.jurisdiction : null),
    jurisdiction: (typeof payload?.jurisdiction === "string" ? payload.jurisdiction : null) || structuredJurisdiction?.country || null,
    state: payload?.state ?? null,
    citations: dedupeCitations(
      structuredCitations
        ? structuredCitations.map((c: any, idx: number) => ({
            doc_id: c.doc_id || (c.source_type === "current_input" ? "live_query" : undefined),
            chunk_id: `qpv2:${idx}`,
            snippet: c.snippet,
            source_type: c.source_type === "current_input" ? "user_doc" : c.source_type,
            source_label: c.source_type === "current_input" ? "Prompt Input" : "Case Document",
          }))
        : (Array.isArray(payload?.citations) ? payload.citations : []),
    ),
    legalResearchAuthorities: (
      Array.isArray(payload?.legal_research_authorities) ? payload.legal_research_authorities : []
    )
      .map((row: any) => {
        const title = String(row?.title || "").trim();
        const section = row?.section == null ? null : String(row.section).trim();
        const relevance = row?.relevance ? String(row.relevance).trim() : undefined;
        if (!title || isPlaceholderAuthorityValue(title)) return null;
        if (section && isPlaceholderAuthorityValue(section)) return null;
        if (relevance && isPlaceholderAuthorityValue(relevance)) return null;
        const rawType = String(row?.authority_type || "").toLowerCase();
        const authorityType =
          rawType === "case_law"
            ? "case_law"
            : rawType === "regulation"
              ? "regulation"
              : rawType === "legal_opinion"
                ? "legal_opinion"
                : "act";
        return {
          title,
          section,
          authorityType,
          relevance,
          source: row?.source === "rag" ? "rag" : row?.source === "llm" ? "llm" : undefined,
          confidence: typeof row?.confidence === "number" ? row.confidence : undefined,
        };
      })
      .filter(Boolean) as any,
    inputHash: payload?.input_hash,
    provenance: {
      case_id: payload?.case_id,
      run_id: payload?.run_id,
      input_hash: payload?.input_hash,
      doc_checksums_used: Array.isArray(payload?.doc_checksums_used) ? payload.doc_checksums_used : [],
      generated_at: payload?.generated_at,
      model_profile: payload?.model_profile,
    },
    runId: payload?.run_id || payload?.provenance?.run_id,
    qaDebug: payload?.qa_debug,
  };
}

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

const OUTPUT_KEY_ALIASES: Record<string, string> = {
  contract_risk: "contract_risk_dispute_settlement",
  outcome_projection: "case_outcome_deadline_penalty",
};

function canonicalAgentKey(key: string) {
  return OUTPUT_KEY_ALIASES[key] || key;
}

function normalizeAgentLabel(agentKey: string) {
  return AGENT_LABELS[agentKey] || agentKey.replaceAll("_", " ");
}

function normalizeGeneratedAt(value: unknown) {
  if (!value) return new Date().toLocaleString("en-IN");
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN");
}

function flattenToText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value
      .map((v) => flattenToText(v))
      .filter(Boolean)
      .join(" ");
    return joined.trim();
  }
  if (value && typeof value === "object") {
    const joined = Object.values(value as Record<string, unknown>)
      .map((v) => flattenToText(v))
      .filter(Boolean)
      .join(" ");
    return joined.trim();
  }
  return "";
}

function extractAgentSummary(agentKey: string, payload: any) {
  if (!payload || typeof payload !== "object") return "";
  const directCandidates = [
    payload.executive_summary,
    payload.executiveSummaryText,
    payload.summary,
    payload.consolidated_summary,
    payload.reasoning,
    payload.facts_summary,
    payload.content,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  if (payload.analysis_valid === false && typeof payload.failure_reason === "string" && payload.failure_reason.trim()) {
    return payload.failure_reason.trim();
  }

  if (agentKey === "contract_risk_dispute_settlement") {
    const level = payload?.scores?.risk_level || payload?.risk_level;
    const score = payload?.scores?.overall_risk_score;
    if (level != null || score != null) {
      return `Risk level: ${level || "Unknown"}${score != null ? ` (score ${score}/10)` : ""}.`;
    }
  }

  if (agentKey === "case_outcome_deadline_penalty") {
    const win = payload?.prediction?.distribution?.win;
    if (typeof win === "number") return `Predicted win likelihood: ${Math.round(win * 100)}%.`;
  }

  if (agentKey === "policy_compliance") {
    const level = payload?.risk_level;
    const score = payload?.overall_score;
    if (level != null || score != null) return `Compliance score: ${score ?? "N/A"} with ${level || "Unknown"} risk.`;
  }

  if (Array.isArray(payload?.sections) && payload.sections.length > 0) {
    const sectionText = flattenToText(payload.sections[0]?.content);
    if (sectionText) return sectionText.slice(0, 420);
  }

  const listCandidates = [payload.legal_grounds, payload.highlights, payload.recommendations, payload.next_actions];
  for (const candidate of listCandidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      const text = flattenToText(candidate[0]);
      if (text) return text;
    }
  }

  return "";
}

function getCitationsCount(payload: any) {
  if (!payload || typeof payload !== "object") return 0;
  if (Array.isArray(payload.citations)) return payload.citations.length;
  return 0;
}

function buildByAgentSummaries(rawOutputs: Record<string, any>) {
  const byCanonical = new Map<
    string,
    {
      agentKey: string;
      agentLabel: string;
      summary: string;
      citations: number;
      status: "ready" | "warning";
    }
  >();

  for (const [outputKey, payload] of Object.entries(rawOutputs || {})) {
    if (!payload || outputKey === "final_summary") continue;
    const agentKey = canonicalAgentKey(outputKey);
    const summary = extractAgentSummary(agentKey, payload);
    const citations = getCitationsCount(payload);
    const status: "ready" | "warning" =
      payload?.analysis_valid === false || (!!payload?.failure_reason && String(payload.failure_reason).trim().length > 0)
        ? "warning"
        : "ready";
    const fallbackSummary =
      status === "warning"
        ? "Completed with warning. Open agent report for details."
        : "Completed with structured output.";
    byCanonical.set(agentKey, {
      agentKey,
      agentLabel: normalizeAgentLabel(agentKey),
      summary: summary || fallbackSummary,
      citations,
      status,
    });
  }

  const preferredOrder = [
    "query_parsing",
    "contract_risk_dispute_settlement",
    "case_outcome_deadline_penalty",
    "policy_compliance",
    "legal_drafts_validation",
  ];

  const sorted = Array.from(byCanonical.values()).sort((a, b) => {
    const ai = preferredOrder.indexOf(a.agentKey);
    const bi = preferredOrder.indexOf(b.agentKey);
    if (ai >= 0 || bi >= 0) return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
    return a.agentLabel.localeCompare(b.agentLabel);
  });

  return sorted;
}

function mapCaseOutputs(details: CaseDetailsResponse): Partial<CaseOutputs> {
  const outputs = details.outputs || {};
  const queryPayload = outputs.query_parsing || {};
  const contractPayload = outputs.contract_risk_dispute_settlement || outputs.contract_risk || {};
  const outcomePayload = outputs.case_outcome_deadline_penalty || outputs.outcome_projection || {};
  const compliancePayload = outputs.policy_compliance || {};
  const draftPayload = outputs.legal_drafts_validation || {};
  const summaryPayload = details.final_summary || outputs.final_summary || {};
  const byAgent = buildByAgentSummaries(outputs);
  const resolvedFinalSummary =
    (typeof summaryPayload?.consolidated_summary === "string" && summaryPayload.consolidated_summary.trim()) ||
    (typeof summaryPayload?.summary === "string" && summaryPayload.summary.trim()) ||
    "";

  const mapped: Partial<CaseOutputs> = {
    query_parse: mapQueryParse(queryPayload),
    contract_risk: {
      summary: contractPayload?.flagged_clauses?.length
        ? `Detected ${contractPayload.flagged_clauses.length} flagged clause(s).`
        : contractPayload?.summary || `Risk level: ${contractPayload?.risk_level || "Unknown"}.`,
      score: contractPayload?.risk_level === "High" ? 80 : contractPayload?.risk_level === "Medium" ? 55 : 30,
    },
    outcome: {
      summary: outcomePayload?.key_factors?.length
        ? `Outcome projection built using ${outcomePayload.key_factors.length} key factor(s).`
        : "Outcome projection generated.",
      probability: outcomePayload?.outcomes ? `${Math.round((outcomePayload.outcomes.win || 0) * 100)}%` : "N/A",
    },
    compliance: {
      summary: compliancePayload?.summary || `Compliance score: ${compliancePayload?.compliance_score ?? "N/A"}.`,
      riskAreas: compliancePayload?.violations || [],
      confidence: compliancePayload?.confidence,
      insufficient_sources: compliancePayload?.insufficient_sources,
      citations: compliancePayload?.citations || [],
    },
    draft: {
      summary: draftPayload?.draft_text || "Draft validation output generated.",
      draftType: draftPayload?.selected_template || "Template",
    },
  };
  if (resolvedFinalSummary || byAgent.length > 0) {
    mapped.final_summary = {
      summary: resolvedFinalSummary || `Compiled summary across ${byAgent.length} agent report(s).`,
      generatedAt: normalizeGeneratedAt(summaryPayload?.generated_at || summaryPayload?.generatedAt),
      byAgent,
    };
  }
  return mapped;
}

function setCaseListCache(value: CaseSummaryResponse[]) {
  caseListCache = {
    value,
    expiresAt: Date.now() + CASE_LIST_CACHE_TTL_MS,
  };
}

function getFreshCaseListCache() {
  if (!caseListCache) return null;
  if (Date.now() > caseListCache.expiresAt) {
    caseListCache = null;
    return null;
  }
  return caseListCache.value;
}

function setCaseDetailsCache(caseId: string, value: CaseDetailsResponse) {
  caseDetailsCache.set(caseId, {
    value,
    expiresAt: Date.now() + CASE_DETAILS_CACHE_TTL_MS,
  });
}

function getFreshCaseDetailsCache(caseId: string) {
  const cached = caseDetailsCache.get(caseId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    caseDetailsCache.delete(caseId);
    return null;
  }
  return cached.value;
}

function invalidateCaseCaches(caseId?: string) {
  caseListCache = null;
  caseSearchCache.clear();
  if (caseId) {
    caseDetailsCache.delete(caseId);
  } else {
    caseDetailsCache.clear();
  }
}

function getVisibleWorkspaceDocumentNames(details: CaseDetailsResponse) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawName of details.documents.map((d) => d.name)) {
    const name = String(rawName || "").trim();
    const normalized = name.toLowerCase();
    if (!name || normalized === "query-context" || normalized === "query input" || normalized === "pasted text") continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(name);
  }
  return out;
}

function syncCaseDetailsIntoStore(caseId: string, details: CaseDetailsResponse) {
  const store = useAppStore.getState();
  const qpPayload = details.outputs?.query_parsing || {};
  const resolvedTitle =
    (typeof details.title === "string" && details.title.trim()) ||
    (typeof qpPayload?.case_title === "string" && qpPayload.case_title.trim()) ||
    store.casesById[caseId]?.title ||
    "Current Case Workspace";
  store.setCaseWorkspace(caseId, resolvedTitle);
  store.setWorkspaceDocuments(caseId, getVisibleWorkspaceDocumentNames(details));
  store.setCaseOutputs(caseId, mapCaseOutputs(details));
}

async function activateCaseInStoreAndBackend(caseId: string, title?: string) {
  const store = useAppStore.getState();
  const resolvedTitle = title || store.casesById[caseId]?.title || store.caseWorkspace.title || "Current Case Workspace";
  store.setCaseWorkspace(caseId, resolvedTitle);
  store.setActiveCaseId(caseId);
  await apiClient.patch("/auth/me/active-case", { case_id: caseId }).catch(() => undefined);
}

async function refreshCaseIntoStore(caseId: string) {
  const details = await apiClient.get<CaseDetailsResponse>(`/cases/${encodeURIComponent(caseId)}`, { timeoutMs: 45_000 });
  setCaseDetailsCache(caseId, details);
  syncCaseDetailsIntoStore(caseId, details);
  return details;
}

const mockService = {
  ensureCase: async (title?: string) => useAppStore.getState().ensureActiveCase(title),
  saveQuery: async (caseId: string, queryText: string) => {
    useAppStore.getState().setCaseQuery(caseId, queryText);
    return { doc_id: `${caseId}-query` };
  },
  runQueryParse: async (caseId: string, queryText: string): Promise<QueryParseResult> => {
    useAppStore.getState().setCaseQuery(caseId, queryText);
    const result: QueryParseResult = {
      summary: `Parsed "${queryText.slice(0, 100)}"`,
      domain: "General",
      riskLabel: "Low",
      highlights: ["Mock fallback enabled"],
    };
    useAppStore.getState().setCaseOutputs(caseId, { query_parse: result });
    return result;
  },
  runAllAgents: async (_caseId: string): Promise<RunAllResult> => {
    throw new Error("API backend unavailable and mock fallback disabled.");
  },
  listCases: async () => [],
  getQueryParsingStats: async (): Promise<QueryParsingStatsResponse> => ({
    analyzed_cases: 0,
    total_runs: 0,
    successful_runs: 0,
    success_rate: 0,
  }),
  getDashboardStats: async (): Promise<DashboardStatsResponse> => ({
    active_contracts: 0,
    active_contracts_delta_week: 0,
    high_risk_cases: 0,
    high_risk_delta_week: 0,
    compliance_score: 0,
    compliance_delta_month: 0,
    resolution_rate: 0,
    resolution_delta_month: 0,
  }),
  getRunStatus: async (_runId: string): Promise<RunStatusResponse> => {
    throw new Error("API backend unavailable and mock fallback disabled.");
  },
  startRun: async (_caseId: string, _filtersApplied?: any) => {
    throw new Error("API backend unavailable and mock fallback disabled.");
  },
  fetchCase: async (_caseId: string) => {
    throw new Error("API backend unavailable and mock fallback disabled.");
  },
  searchWorkspace: async (_query: string) => [],
  uploadFiles: async (_caseId: string, _files: File[], _options?: { addToWorkspace?: boolean }) => {
    throw new Error("API backend unavailable and mock fallback disabled.");
  },
  activateCase: async (_caseId: string, _title?: string) => ({ case_id: _caseId }),
};

const apiService = {
  async ensureCase(title?: string) {
    const store = useAppStore.getState();
    if (store.activeCaseId) {
      try {
        await apiClient.get(`/cases/${encodeURIComponent(store.activeCaseId)}`);
        return store.activeCaseId;
      } catch (error) {
        const msg = error instanceof Error ? error.message.toLowerCase() : "";
        if (!msg.includes("case not found") && !msg.includes("not found")) {
          throw error;
        }
      }
    }
    const created = await apiClient.post<{ case_id: string }>("/cases", { title: title || "Current Case Workspace" });
    invalidateCaseCaches();
    store.setCaseWorkspace(created.case_id, title || "Current Case Workspace");
    store.setActiveCaseId(created.case_id);
    try { await apiClient.patch("/auth/me/active-case", { case_id: created.case_id }); } catch {}
    return created.case_id;
  },

  async activateCase(caseId: string, title?: string) {
    await activateCaseInStoreAndBackend(caseId, title);
    return { case_id: caseId };
  },

  async saveQuery(caseId: string, queryText: string) {
    useAppStore.getState().setCaseQuery(caseId, queryText);
    invalidateCaseCaches(caseId);
    const saved = await apiClient.post<{ doc_id: string }>(`/cases/${encodeURIComponent(caseId)}/text`, {
      text: queryText,
      title: "query-context",
    });
    invalidateCaseCaches(caseId);
    return saved;
  },

  async previewQueryParse(caseId: string, queryText: string, filters?: QueryParseFilters): Promise<QueryParseResult> {
    const payload = await apiClient.post<any>(`/cases/${encodeURIComponent(caseId)}/query-preview`, {
      text: queryText,
      filtersApplied: toBackendFilters(filters),
    });
    return mapQueryParse(payload);
  },

  async startQueryParseRun(caseId: string, queryText: string, filters?: QueryParseFilters) {
    invalidateCaseCaches(caseId);
    if (queryText.trim()) {
      await withTransientRetry(() => apiService.saveQuery(caseId, queryText), 2, 300);
    }
    return withTransientRetry(() => apiClient.post<{ run_id: string }>(
      `/cases/${encodeURIComponent(caseId)}/query-parsing/run`,
      {
        text: queryText,
        filtersApplied: toBackendFilters(filters),
      },
    ), 1);
  },

  async runQueryParse(caseId: string, queryText: string, filters?: QueryParseFilters): Promise<QueryParseResult> {
    const startedAt = Date.now();
    invalidateCaseCaches(caseId);
    if (queryText.trim()) {
      // For query-parsing-only runs, persist submitted text first so backend always has a primary input document.
      await withTransientRetry(() => apiService.saveQuery(caseId, queryText), 2, 300);
    }
    const { run_id } = await withTransientRetry(() => apiClient.post<{ run_id: string }>(
      `/cases/${encodeURIComponent(caseId)}/query-parsing/run`,
      {
        text: queryText,
        filtersApplied: toBackendFilters(filters),
      },
    ), 1);
    let status: RunStatusResponse | null = null;
    let reachedTerminal = false;
    let transientFetchErrors = 0;
    for (let i = 0; i < QUERY_PARSE_MAX_POLL_ATTEMPTS; i += 1) {
      try {
        status = await withTransientRetry(() => runService.getStatus(run_id), 2, 300);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          transientFetchErrors += 1;
          await delay(600);
          continue;
        }
        throw error;
      }
      if (status.status === "SUCCEEDED") {
        reachedTerminal = true;
        break;
      }
      if (status.status === "FAILED") {
        const backendReason =
          (status as any)?.error_message ||
          (status as any)?.error ||
          (status as any)?.progress?.step ||
          "";
        throw new Error(
          backendReason
            ? `Analysis run failed: ${String(backendReason)}`
            : "Analysis run failed",
        );
      }
      await delay(QUERY_PARSE_POLL_DELAY_MS);
    }
    if (!reachedTerminal) {
      try {
        const finalStatus = await withTransientRetry(() => runService.getStatus(run_id), 2, 300);
        if (finalStatus.status === "SUCCEEDED") {
          reachedTerminal = true;
        } else if (finalStatus.status === "FAILED") {
          const backendReason =
            (finalStatus as any)?.error_message ||
            (finalStatus as any)?.error ||
            (finalStatus as any)?.progress?.step ||
            "";
          throw new Error(
            backendReason
              ? `Analysis run failed: ${String(backendReason)}`
              : "Analysis run failed",
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!/Analysis run failed/i.test(msg)) {
          // Fall through to final case refresh check below.
        } else {
          throw error;
        }
      }
    }
    if (!reachedTerminal) {
      try {
        const details = await withTransientRetry(() => refreshCaseIntoStore(caseId), 2, 400);
        const refreshedRunId =
          details?.outputs?.query_parsing?.run_id ||
          details?.outputs?.query_parsing?.provenance?.run_id ||
          "";
        if (refreshedRunId === run_id || details?.outputs?.query_parsing) {
          reachedTerminal = true;
        }
      } catch {
        // If refresh fails too, fall through to the timeout message below.
      }
    }
    if (!reachedTerminal) {
      if (transientFetchErrors > 0) {
        throw new Error(`Query Parsing could not reach backend reliably during polling (run_id=${run_id}).`);
      }
      throw new Error(`Query Parsing is taking longer than expected. Please wait a moment and retry loading the result (run_id=${run_id}).`);
    }
    const details = await withTransientRetry(() => refreshCaseIntoStore(caseId), 2, 400);
    invalidateCaseCaches(caseId);
    if (typeof window !== "undefined") {
      localStorage.setItem(`${QUERY_STATS_TIME_KEY}:${caseId}`, String(Date.now() - startedAt));
    }
    const result = mapQueryParse(details.outputs?.query_parsing);
    const store = useAppStore.getState();
    const parsedTitle = String(result.caseTitle || "").trim();
    if (parsedTitle) {
      store.setCaseWorkspace(caseId, parsedTitle);
    } else {
      const refreshedTitle = String((details as any)?.title || "").trim();
      if (refreshedTitle) store.setCaseWorkspace(caseId, refreshedTitle);
    }
    store.setActiveCaseId(caseId);
    void apiClient.patch("/auth/me/active-case", { case_id: caseId }).catch(() => undefined);
    if (!result.runId) result.runId = run_id;
    if (!result.provenance) result.provenance = {};
    if (!result.provenance.run_id) result.provenance.run_id = run_id;
    return result;
  },
  listCases() {
    const cached = getFreshCaseListCache();
    if (cached) return Promise.resolve(cached);
    return apiClient.get<CaseSummaryResponse[]>("/cases").then((rows) => {
      setCaseListCache(rows);
      return rows;
    });
  },
  getQueryParsingStats() {
    return apiClient.get<QueryParsingStatsResponse>("/cases/stats/query-parsing");
  },
  getDashboardStats() {
    return apiClient.get<DashboardStatsResponse>("/cases/stats/dashboard");
  },

  async runAllAgents(caseId: string): Promise<RunAllResult> {
    invalidateCaseCaches(caseId);
    const started = await apiClient.post<{ run_id?: string; run_all_id?: string }>(`/cases/${encodeURIComponent(caseId)}/run-all`);
    if (started.run_all_id) {
      for (let i = 0; i < 240; i += 1) {
        const agg = await apiClient.get<RunAllAggregateStatus>(`/cases/${encodeURIComponent(caseId)}/run-all/${encodeURIComponent(started.run_all_id)}/status`);
        if (agg.overall_status === "done") break;
        if (agg.overall_status === "error") throw new Error("Run failed");
        await delay(450);
      }
    } else if (started.run_id) {
      for (let i = 0; i < 180; i += 1) {
        const status = await runService.getStatus(started.run_id);
        if (status.status === "SUCCEEDED") break;
        if (status.status === "FAILED") throw new Error("Run failed");
        await delay(450);
      }
    }
    await refreshCaseIntoStore(caseId);
    invalidateCaseCaches(caseId);
    return (useAppStore.getState().casesById[caseId]?.outputs || {}) as RunAllResult;
  },

  getRunStatus(runId: string) {
    return runService.getStatus(runId);
  },
  startRun(caseId: string, filtersApplied?: any, text?: string, force?: boolean, docNames?: string[]) {
    const body: any = {};
    if (filtersApplied) body.filtersApplied = filtersApplied;
    if (typeof text === "string") body.text = text;
    if (typeof force === "boolean") body.force = force;
    if (Array.isArray(docNames) && docNames.length) body.doc_names = docNames;
    invalidateCaseCaches(caseId);
    return apiClient.post<{ run_id?: string; run_all_id?: string; runs?: Record<string, string> }>(`/cases/${encodeURIComponent(caseId)}/run-all`, Object.keys(body).length ? body : {});
  },
  getRunAllStatus(caseId: string, runAllId: string) {
    return apiClient.get<RunAllAggregateStatus>(`/cases/${encodeURIComponent(caseId)}/run-all/${encodeURIComponent(runAllId)}/status`, { timeoutMs: 45_000 });
  },
  cancelRunAll(caseId: string, runAllId: string) {
    return apiClient.post<RunAllAggregateStatus>(`/cases/${encodeURIComponent(caseId)}/run-all/${encodeURIComponent(runAllId)}/cancel`);
  },
  fetchCase(caseId: string) {
    const cached = getFreshCaseDetailsCache(caseId);
    if (cached) {
      void Promise.resolve().then(() => {
        syncCaseDetailsIntoStore(caseId, cached);
      });
      return Promise.resolve(cached);
    }
    return refreshCaseIntoStore(caseId);
  },

  async searchWorkspace(query: string) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return [];
    const cached = caseSearchCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const caseRows = await apiService.listCases();
    const caseItems: SearchResultItem[] = caseRows
      .filter((item) => {
        const hay = `${item.case_id} ${item.title} ${item.domain}`.toLowerCase();
        return hay.includes(normalized);
      })
      .map((item): SearchResultItem => ({
        id: item.case_id,
        title: item.title,
        type: "Case",
        href: `/app/cases/${item.case_id}`,
        subtitle: item.domain || "Case workspace",
      }));

    const detailResults = await Promise.all(
      caseRows.slice(0, 25).map(async (item) => {
        try {
          const details = getFreshCaseDetailsCache(item.case_id) || await apiService.fetchCase(item.case_id);
          return details;
        } catch {
          return null;
        }
      }),
    );

    const documentItems: SearchResultItem[] = detailResults
      .filter(Boolean)
      .flatMap((details) =>
        ((details as CaseDetailsResponse).documents || [])
          .filter((doc) => {
            const hay = `${doc.doc_id} ${doc.name} ${doc.type}`.toLowerCase();
            return hay.includes(normalized);
          })
          .map((doc): SearchResultItem => ({
            id: doc.doc_id,
            title: doc.name,
            type: "Document",
            href: `/app/cases/${(details as CaseDetailsResponse).case_id}/documents/${doc.doc_id}`,
            subtitle: (details as CaseDetailsResponse).title || "Case document",
          })),
      );

    const agentCatalog = [
      { id: "AGENT-QUERY", title: "Query Parsing", type: "Agent", href: "/app/agents/query", subtitle: "Structured intake and issue parsing" },
      { id: "AGENT-CONTRACT", title: "Contract Risk", type: "Agent", href: "/app/agents/contract", subtitle: "Contract review and dispute risk" },
      { id: "AGENT-OUTCOME", title: "Outcome Prediction", type: "Agent", href: "/app/agents/outcome", subtitle: "Likely outcome, duration, and penalties" },
      { id: "AGENT-COMPLIANCE", title: "Policy & Compliance", type: "Agent", href: "/app/agents/compliance", subtitle: "Legal risk and compliance review" },
      { id: "AGENT-DRAFTS", title: "Legal Drafts", type: "Agent", href: "/app/agents/draft", subtitle: "Template-based legal drafting" },
      { id: "AGENT-SUMMARIES", title: "Summaries", type: "Agent", href: "/app/agents/summary", subtitle: "Consolidated final outputs" },
    ] as const satisfies SearchResultItem[];
    const filteredAgentCatalog: SearchResultItem[] = agentCatalog.filter((item) =>
      `${item.id} ${item.title} ${item.subtitle || ""}`.toLowerCase().includes(normalized),
    );

    const merged = [...caseItems, ...documentItems, ...filteredAgentCatalog].slice(0, 40);
    caseSearchCache.set(normalized, {
      value: merged,
      expiresAt: Date.now() + CASE_SEARCH_CACHE_TTL_MS,
    });
    return merged;
  },

  async uploadFiles(caseId: string, files: File[], options?: { addToWorkspace?: boolean }) {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const result = await apiClient.post<{ documents: Array<{ name: string }> }>(`/cases/${encodeURIComponent(caseId)}/upload`, form);
    invalidateCaseCaches(caseId);
    const details = await refreshCaseIntoStore(caseId);
    if (options?.addToWorkspace === false) {
      useAppStore.getState().setWorkspaceDocuments(caseId, getVisibleWorkspaceDocumentNames(details));
    }
    return result;
  },

  refreshCaseIntoStore,
};

async function isApiReachable() {
  if (!apiBaseUrl) return false;
  try {
    const res = await fetch(`${apiBaseUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function resolveService() {
  const reachable = await isApiReachable();
  return reachable ? apiService : (apiFallbackEnabled ? mockService : apiService);
}

export const caseService = {
  isApiMode: async () => isApiReachable(),
  listCases: async () => (await resolveService()).listCases(),
  getQueryParsingStats: async () => (await resolveService()).getQueryParsingStats(),
  getDashboardStats: async () => (await resolveService()).getDashboardStats(),
  ensureCase: async (title?: string) => (await resolveService()).ensureCase(title),
  saveQuery: async (caseId: string, queryText: string) => (await resolveService()).saveQuery(caseId, queryText),
  runQueryParse: async (caseId: string, queryText: string, filters?: QueryParseFilters) =>
    (await resolveService()).runQueryParse(caseId, queryText, filters),
  startQueryParseRun: async (caseId: string, queryText: string, filters?: QueryParseFilters) =>
    apiService.startQueryParseRun(caseId, queryText, filters),
  previewQueryParse: async (caseId: string, queryText: string, filters?: QueryParseFilters) =>
    apiService.previewQueryParse(caseId, queryText, filters),
  runAllAgents: async (caseId: string) => (await resolveService()).runAllAgents(caseId),
  getRunStatus: async (runId: string) => (await resolveService()).getRunStatus(runId),
  startRun: async (caseId: string, filtersApplied?: any, text?: string, force?: boolean, docNames?: string[]) => (await resolveService()).startRun(caseId, filtersApplied, text, force, docNames),
  getRunAllStatus: async (caseId: string, runAllId: string) => apiService.getRunAllStatus(caseId, runAllId),
  cancelRunAll: async (caseId: string, runAllId: string) => apiService.cancelRunAll(caseId, runAllId),
  fetchCase: async (caseId: string) => (await resolveService()).fetchCase(caseId),
  activateCase: async (caseId: string, title?: string) => (await resolveService()).activateCase(caseId, title),
  searchWorkspace: async (query: string) => apiService.searchWorkspace(query),
  uploadFiles: async (caseId: string, files: File[], options?: { addToWorkspace?: boolean }) =>
    (await resolveService()).uploadFiles(caseId, files, options),
  refreshCaseIntoStore: async (caseId: string) => apiService.refreshCaseIntoStore(caseId),
};

export type { QueryParseFilters, RunAllResult };

function toBackendFilters(filters?: QueryParseFilters) {
  if (!filters) return undefined;
  const dateRange = mapDateRange(filters.dateRange);
  return {
    jurisdiction: filters.jurisdiction,
    legal_domain: filters.legalDomain,
    date_range: dateRange,
    source_types: filters.sourceTypes,
  };
}

function dedupeCitations(citations: Array<{ doc_id?: string; chunk_id?: string; snippet?: string; source_type?: string; source_label?: string }>) {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const normalizedSnippet = String(c.snippet || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 140);
    const key = normalizedSnippet
      ? `${c.source_type || ""}::${c.doc_id || ""}::${normalizedSnippet}`
      : `${c.source_type || ""}::${c.doc_id || ""}::${c.chunk_id || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapDateRange(label?: string) {
  if (!label) return undefined;
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (label) {
    case "Last 3 months": {
      const from = new Date(to);
      from.setUTCMonth(from.getUTCMonth() - 3);
      return { from: fmt(from), to: fmt(to) };
    }
    case "Last 6 months": {
      const from = new Date(to);
      from.setUTCMonth(from.getUTCMonth() - 6);
      return { from: fmt(from), to: fmt(to) };
    }
    case "Last 12 months": {
      const from = new Date(to);
      from.setUTCFullYear(from.getUTCFullYear() - 1);
      return { from: fmt(from), to: fmt(to) };
    }
    case "All time":
      return { from: "2010-01-01", to: "2035-12-31" };
    default:
      return { from: label, to: label };
  }
}

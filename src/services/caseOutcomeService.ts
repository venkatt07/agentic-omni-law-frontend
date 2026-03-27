import { apiClient } from "./apiClient";
import { runService, type RunStatusResponse } from "./runService";

export type CaseOutcomeOutput = {
  agent_key: string;
  mode: "normal" | "fallback";
  analysis_valid: boolean;
  failure_reason: string | null;
  doc_summary: { doc_type_guess: string; language: string; pages?: number | null };
  prefill: {
    case_type?: string | null;
    jurisdiction?: string | null;
    claim_amount?: string | null;
    facts_summary?: string | null;
    key_legal_issues?: string[];
    evidence_strength?: string | null;
  };
  prediction: { distribution: { win: number; settle: number; lose: number }; confidence: number };
  ranges?: { duration_months?: [number, number] | null; award_or_cost_range_inr?: [number, number] | null };
  similar_corpus_available?: boolean;
  similar_cases?: Array<{ title: string; relevance?: number; summary?: string }>;
  deadlines_and_penalties?: Array<{ label: string; detail?: string | null; citation_ref?: number | null }>;
  recommendations?: string[];
  clarifying_questions?: string[];
  citations?: Array<{ source_type: string; doc_id?: string | null; snippet: string; page?: number | null }>;
  qa_debug?: Record<string, any>;
};

export type CaseOutcomeMeta = {
  case: { case_id: string; title: string; domain: string; language: string };
  primary_doc: { doc_id: string; filename: string; mime_type: string; kind?: string | null; pages: number | null; char_count?: number | null; updated_at: string } | null;
  query_parsing: { output: any | null };
  prefill_defaults?: {
    case_type?: string | null;
    domain?: string | null;
    domain_subtype?: string | null;
    jurisdiction?: string | null;
    claim_amount?: string | null;
    facts_summary?: string | null;
    key_legal_issues?: string[];
    evidence_strength?: string | null;
  };
  latest: { status: "none" | "running" | "done" | "error" | "blocked"; run_id?: string | null; output?: CaseOutcomeOutput | null; mode?: string; analysis_valid?: boolean; failure_reason?: string | null };
  recent_runs: Array<{ run_id: string; status: "done" | "error"; created_at: string }>;
  qa_debug?: Record<string, any>;
};

export const caseOutcomeService = {
  getMeta(caseId: string) {
    return apiClient.get<CaseOutcomeMeta>(`/cases/${encodeURIComponent(caseId)}/agents/case-outcome`);
  },
  startRun(caseId: string, input?: { force?: boolean; user_overrides?: Record<string, any> }) {
    return apiClient.post<{ status: "cached" | "queued" | "running"; run_id?: string; output?: CaseOutcomeOutput }>(`/cases/${encodeURIComponent(caseId)}/agents/case-outcome/run`, input || {});
  },
  getOutput(caseId: string) {
    return apiClient.get<CaseOutcomeOutput>(`/cases/${encodeURIComponent(caseId)}/agents/case-outcome/output`);
  },
  getExportUrl(caseId: string) {
    return `${apiClient.baseUrl}/cases/${encodeURIComponent(caseId)}/agents/case-outcome/export.pdf`;
  },
  getRunStatus(runId: string) {
    return runService.getStatus(runId) as Promise<RunStatusResponse>;
  },
};

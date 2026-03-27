import { apiClient } from "./apiClient";
import { runService } from "./runService";

export type ContractCitation = {
  source_type: "USER_DOC";
  doc_id: string;
  snippet: string;
  offsetStart?: number;
  offsetEnd?: number;
  page?: number;
  source_label?: string;
};

export type ContractClauseFinding = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  category: string;
  issue: string;
  impact: string;
  recommendation: string[];
  suggested_rewrite: string;
  evidence?: ContractCitation;
  confidence: number;
  needs_review?: boolean;
};

export type ContractRiskOutput = {
  agent_key: string;
  mode?: "llm_refined" | "deterministic_fallback" | "grounded_contract_analysis";
  analysis_valid?: boolean;
  failure_reason?: string | null;
  doc_summary: {
    doc_type_guess: string;
    language: string;
    parties: string[];
    effective_date?: string | null;
    term?: string | null;
    pages?: number | null;
  };
  scores: { overall_risk_score: number; risk_level: "Low" | "Medium" | "High" };
  counts: { total_clauses_found: number; high_risk: number; medium_risk: number; low_risk: number; missing_clauses: number };
  risk_distribution: Record<string, number>;
  high_risk_clauses: ContractClauseFinding[];
  medium_risk_clauses: ContractClauseFinding[];
  low_risk_clauses: ContractClauseFinding[];
  missing_clauses_list: Array<{ id: string; clause_name: string; why_it_matters: string; suggested_text: string; confidence: number }>;
  suggestions: { negotiation_priorities: string[]; red_flags: string[]; quick_improvements: string[] };
  dispute_resolution_and_settlement: {
    dispute_clause_found: boolean;
    dispute_clause_summary: string;
    recommended_path: string[];
    negotiation_script: string;
    settlement_options: Array<{ option: string; when_to_use: string; upside: string; risk: string }>;
    red_flags_to_avoid: string[];
  };
  citations: ContractCitation[];
  user_questions_to_confirm: string[];
  qa_debug?: Record<string, any>;
};

export type ContractRiskOverview = {
  agent_key: string;
  primary_doc: {
    doc_id: string;
    filename: string;
    mime_type: string;
    updated_at: string;
    language: string;
    kind?: string | null;
    pages?: number | null;
    char_count?: number | null;
  } | null;
  latest_output_status: "none" | "running" | "done" | "error" | "blocked";
  latest_run_id?: string | null;
  latest_output?: ContractRiskOutput | null;
  recent_runs: Array<{ run_id: string; case_id?: string; status: string; timestamp: string; case_title?: string; risk_level?: string | null }>;
  case?: { case_id: string; title: string; domain: string; language: string };
  query_parsing?: { output: any | null };
  latest?: { status: string; run_id?: string | null; output?: ContractRiskOutput | null; mode?: string; analysis_valid?: boolean; failure_reason?: string | null };
  selected_run?: { run_id: string; status: string; timestamp: string; case_title: string; doc_hash?: string; viewing_historical?: boolean } | null;
  qa_debug?: Record<string, any>;
};

export type ContractRiskRunStatus = {
  run_id: string;
  status: string;
  steps: Array<{ name: string; state: string; progress: number; message?: string }>;
  stage?: string;
  stepIndex?: number;
  stepsTotal?: number;
  stats?: { clausesFound: number; risksDetected: number; missingClauses: number };
  done?: boolean;
  error?: string | null;
  error_message?: string | null;
  meta?: Record<string, any>;
};

export const contractRiskService = {
  getOverview(caseId: string, runId?: string | null) {
    const qs = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
    return apiClient.get<ContractRiskOverview>(`/cases/${encodeURIComponent(caseId)}/agents/contract-risk${qs}`, { timeoutMs: 45_000 });
  },
  startRun(caseId: string, force = false) {
    return apiClient.post<{ status: "cached" | "queued" | "running"; run_id?: string; output?: ContractRiskOutput }>(
      `/cases/${encodeURIComponent(caseId)}/agents/contract-risk/run`,
      force ? { force: true } : {},
    );
  },
  getOutput(caseId: string, runId?: string | null) {
    const qs = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
    return apiClient.get<ContractRiskOutput>(`/cases/${encodeURIComponent(caseId)}/agents/contract-risk/output${qs}`, { timeoutMs: 45_000 });
  },
  getRunStatus(runId: string) {
    return runService.getStatus(runId) as Promise<ContractRiskRunStatus>;
  },
  getExportUrl(caseId: string) {
    return `${apiClient.baseUrl}/cases/${encodeURIComponent(caseId)}/agents/contract-risk/export.pdf`;
  },
};

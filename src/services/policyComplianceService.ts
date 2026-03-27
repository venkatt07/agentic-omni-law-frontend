import { apiClient } from "./apiClient";
import { runService, type RunStatusResponse } from "./runService";

export type PolicyCitation = {
  ref: string;
  source_type: "user_doc" | "legal_corpus";
  doc_id: string;
  page?: number | null;
  offset_start?: number | null;
  offset_end?: number | null;
  snippet: string;
};

export type PolicyComplianceOutput = {
  framework_selected: string;
  overall_score: number;
  risk_level: "Low" | "Medium" | "High";
  counts: { critical: number; medium: number; compliant: number };
  category_scores: Array<{ category: string; score: number; critical: number; medium: number; compliant: number }>;
  violations: Array<{
    severity: "Critical" | "Medium";
    title: string;
    why_it_matters: string;
    recommended_fix: string;
    law_basis: Array<{ citation_ref: string }>;
    case_evidence: Array<{ citation_ref: string }>;
    confidence: number;
  }>;
  remediation_plan: Array<{
    step: number;
    action: string;
    priority: "High" | "Medium" | "Low";
    owner: "Client" | "Lawyer" | "Both";
    depends_on: string[];
  }>;
  decision_support: {
    best_path: "Negotiate" | "Send Notice" | "Litigate" | "Arbitrate" | "File Complaint" | "Unknown";
    reasoning: string;
    what_changes_the_outcome: string[];
  };
  citations: PolicyCitation[];
  analysis_valid: boolean;
  mode: "normal" | "fallback";
  failure_reason: string | null;
  clarifying_questions: string[];
  qa_debug?: Record<string, any>;
};

export type PolicyComplianceMeta = {
  case: { case_id: string; title: string; domain: string; language: string };
  primary_doc: {
    doc_id: string;
    filename: string;
    mime_type: string;
    kind?: string | null;
    pages?: number | null;
    char_count?: number | null;
    updated_at: string;
    language?: string;
  } | null;
  workspace_summary?: {
    total_documents: number;
    uploaded_documents: number;
    pasted_documents: number;
    total_pages?: number | null;
    total_char_count: number;
  } | null;
  query_parsing_subset: {
    domain?: any;
    subtype?: string | null;
    legal_grounds?: string[];
    key_facts?: any;
  } | null;
  latest: {
    status: "none" | "running" | "done" | "error";
    run_id?: string | null;
    output?: PolicyComplianceOutput | null;
    analysis_valid?: boolean;
    mode?: "normal" | "fallback";
    failure_reason?: string | null;
  };
  recent_runs: Array<{ run_id: string; status: "running" | "done" | "error"; created_at: string; risk_level?: string | null }>;
  frameworks: string[];
  qa_debug?: Record<string, any>;
};

export const policyComplianceService = {
  getMeta(caseId: string) {
    return apiClient.get<PolicyComplianceMeta>(`/cases/${encodeURIComponent(caseId)}/agents/policy-compliance`);
  },
  startRun(caseId: string, input?: { force?: boolean; framework?: string | null }) {
    return apiClient.post<{ status: "cached" | "queued" | "running"; run_id?: string; output?: PolicyComplianceOutput }>(
      `/cases/${encodeURIComponent(caseId)}/agents/policy-compliance/run`,
      input || {},
    );
  },
  getOutput(caseId: string) {
    return apiClient.get<PolicyComplianceOutput>(`/cases/${encodeURIComponent(caseId)}/agents/policy-compliance/output`);
  },
  getExportUrl(caseId: string) {
    return `${apiClient.baseUrl}/cases/${encodeURIComponent(caseId)}/agents/policy-compliance/export.pdf`;
  },
  getRunStatus(runId: string) {
    return runService.getStatus(runId) as Promise<RunStatusResponse>;
  },
};

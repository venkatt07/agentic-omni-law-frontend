import { apiClient } from "./apiClient";
import { runService, type RunStatusResponse } from "./runService";

export type DraftTemplate = {
  key: string;
  title: string;
  category: string;
  description: string;
  required: string[];
  jurisdiction_default: string;
  fit?: {
    template_key: string;
    score: number;
    confidence: "high" | "medium" | "low";
    recommended: boolean;
    reason: string;
    caution: string | null;
  };
};

export type DraftMeta = {
  case: { case_id: string; title: string; domain: string; language: string };
  primary_doc: {
    doc_id: string;
    filename: string;
    mime_type: string;
    kind?: string | null;
    pages?: number | null;
    char_count?: number | null;
    updated_at: string;
  } | null;
  query_parsing_subset: {
    domain?: any;
    subtype?: string | null;
    key_facts?: any;
    legal_grounds?: string[];
  } | null;
  templates: DraftTemplate[];
  template_recommendation?: {
    template_key: string;
    score: number;
    confidence: "high" | "medium" | "low";
    recommended: boolean;
    reason: string;
    caution: string | null;
  } | null;
  recent_drafts: Array<{
    draft_id: string;
    template_key: string;
    title: string;
    status: string;
    mode: "normal" | "fallback";
    analysis_valid: boolean;
    updated_at: string;
  }>;
  qa_debug?: Record<string, any>;
};

export type DraftDetail = {
  draft_id: string;
  template_key: string;
  title: string;
  content: string;
  suggestions: {
    add_clauses: Array<{ title: string; why: string; insert_after: string | null; suggested_text: string }>;
    customizations: Array<{ section: string; issue: string; fix: string }>;
    well_structured: string[];
    alternative_clauses: Array<{ label: string; text: string }>;
  };
  evidence_validation: {
    required_items: Array<{ item: string; status: "present" | "missing" | "conflicting"; notes: string; citation_refs: string[] }>;
    overall_readiness: "Ready" | "Needs Inputs" | "Conflicting Evidence";
  };
  citations: Array<{
    ref: string;
    source_type: "user_doc";
    doc_id: string;
    page?: number | null;
    offset_start?: number | null;
    offset_end?: number | null;
    snippet: string;
  }>;
  clarifying_questions: string[];
  analysis_valid: boolean;
  mode: "normal" | "fallback";
  failure_reason: string | null;
  qa_debug?: Record<string, any>;
  status?: string;
  run_id?: string | null;
  updated_at?: string;
};

export const legalDraftsService = {
  getMeta(caseId: string) {
    return apiClient.get<DraftMeta>(`/cases/${encodeURIComponent(caseId)}/agents/legal-drafts`);
  },
  generate(caseId: string, body: { template_key: string; language?: string; jurisdiction?: string; party_overrides?: any; extra_instructions?: string; auto_select?: boolean }) {
    return apiClient.post<{ draft_id: string; status: "queued" | "running" | "cached"; run_id?: string }>(
      `/cases/${encodeURIComponent(caseId)}/agents/legal-drafts/generate`,
      body,
    );
  },
  getDraft(caseId: string, draftId: string) {
    return apiClient.get<DraftDetail>(`/cases/${encodeURIComponent(caseId)}/agents/legal-drafts/${encodeURIComponent(draftId)}`);
  },
  save(caseId: string, draftId: string, body?: { content?: string }) {
    return apiClient.post<DraftDetail>(
      `/cases/${encodeURIComponent(caseId)}/agents/legal-drafts/${encodeURIComponent(draftId)}/save`,
      body || {},
    );
  },
  getExportPdfUrl(caseId: string, draftId: string) {
    return `${apiClient.baseUrl}/cases/${encodeURIComponent(caseId)}/agents/legal-drafts/${encodeURIComponent(draftId)}/export.pdf`;
  },
  getExportDocxUrl(caseId: string, draftId: string) {
    return `${apiClient.baseUrl}/cases/${encodeURIComponent(caseId)}/agents/legal-drafts/${encodeURIComponent(draftId)}/export.docx`;
  },
  getRunStatus(runId: string) {
    return runService.getStatus(runId) as Promise<RunStatusResponse>;
  },
};

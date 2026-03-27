import { apiClient } from "@/services/apiClient";

export const roleAgentsService = {
  getMeta(caseId: string, agentKey: string, params?: { output_lang?: string; profile?: string }) {
    const qp = new URLSearchParams();
    if (params?.output_lang) qp.set("output_lang", params.output_lang);
    if (params?.profile) qp.set("profile", params.profile);
    const suffix = qp.toString() ? `?${qp.toString()}` : "";
    return apiClient.get(`/cases/${caseId}/agents/${agentKey}${suffix}`);
  },

  startRun(caseId: string, agentKey: string, payload?: { force?: boolean; output_lang?: string; profile?: string }) {
    return apiClient.post(`/cases/${caseId}/agents/${agentKey}/run`, payload || {});
  },

  getOutput(caseId: string, agentKey: string, params?: { output_lang?: string; profile?: string }) {
    const qp = new URLSearchParams();
    if (params?.output_lang) qp.set("output_lang", params.output_lang);
    if (params?.profile) qp.set("profile", params.profile);
    const suffix = qp.toString() ? `?${qp.toString()}` : "";
    return apiClient.get(`/cases/${caseId}/agents/${agentKey}/output${suffix}`);
  },

  getExportUrl(caseId: string, agentKey: string) {
    return `${apiClient.baseUrl}/cases/${encodeURIComponent(caseId)}/agents/${encodeURIComponent(agentKey)}/export.pdf`;
  },
};

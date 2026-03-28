import { apiClient } from "./apiClient";

export interface RunStatusResponse {
  run_id: string;
  status: string;
  steps: Array<{ name: string; state: string; progress: number; message?: string }>;
  started_at?: string;
  updated_at?: string;
  progress?: { step?: string | null; pct?: number; stats?: Record<string, any> };
  error_message?: string | null;
  stage?: string;
  stats?: Record<string, any>;
  done?: boolean;
  error?: string | null;
  meta?: Record<string, any>;
}

export const runService = {
  getStatus(runId: string) {
    return apiClient.get<RunStatusResponse>(`/runs/${encodeURIComponent(runId)}/status`);
  },
  cancel(runId: string) {
    return apiClient.post<{ ok: boolean; run_id: string; status: string }>(`/runs/${encodeURIComponent(runId)}/cancel`);
  },
  stop(runId: string) {
    return apiClient.post<{ ok: boolean; run_id: string; status: string }>(`/runs/${encodeURIComponent(runId)}/stop`);
  },
};

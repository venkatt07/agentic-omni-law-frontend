import type { RunLogLine } from "@/components/app/run-console/useRunState";

export type RuntimeActivityStage = "query_parsing" | "case_outcome";

interface StoredRuntimeActivity {
  caseId: string;
  stage: RuntimeActivityStage;
  runId?: string;
  savedAt: number;
  lines: RunLogLine[];
}

const ACTIVITY_PREFIX = "runtime_activity_v1:";
const ACTIVITY_POINTER_PREFIX = "runtime_activity_latest_v1:";
const DEFAULT_SCOPE = "latest";

function normalizeScope(runId?: string) {
  return String(runId || "").trim() || DEFAULT_SCOPE;
}

function activityKey(caseId: string, stage: RuntimeActivityStage, runId?: string) {
  return `${ACTIVITY_PREFIX}${caseId}:${stage}:${normalizeScope(runId)}`;
}

function activityPointerKey(caseId: string, stage: RuntimeActivityStage) {
  return `${ACTIVITY_POINTER_PREFIX}${caseId}:${stage}`;
}

export function mergeRuntimeActivityLines(...groups: Array<RunLogLine[] | null | undefined>) {
  const merged: RunLogLine[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const line of group) {
      if (!line?.id || seen.has(line.id)) continue;
      seen.add(line.id);
      merged.push(line);
    }
  }

  return merged;
}

export function saveRuntimeActivity(params: {
  caseId: string;
  stage: RuntimeActivityStage;
  lines: RunLogLine[];
  runId?: string;
}) {
  if (typeof window === "undefined") return;
  const caseId = String(params.caseId || "").trim();
  if (!caseId || !params.lines?.length) return;

  const payload: StoredRuntimeActivity = {
    caseId,
    stage: params.stage,
    runId: params.runId ? String(params.runId).trim() : undefined,
    savedAt: Date.now(),
    lines: params.lines,
  };

  try {
    sessionStorage.setItem(activityKey(caseId, params.stage, payload.runId), JSON.stringify(payload));
    sessionStorage.setItem(activityPointerKey(caseId, params.stage), normalizeScope(payload.runId));
  } catch {
    // Ignore storage quota issues and continue rendering.
  }
}

export function readRuntimeActivity(caseId: string, stage: RuntimeActivityStage, runId?: string) {
  if (typeof window === "undefined") return null as StoredRuntimeActivity | null;
  const normalizedCaseId = String(caseId || "").trim();
  if (!normalizedCaseId) return null;

  try {
    const scope =
      normalizeScope(runId) !== DEFAULT_SCOPE
        ? normalizeScope(runId)
        : sessionStorage.getItem(activityPointerKey(normalizedCaseId, stage)) || DEFAULT_SCOPE;
    const raw = sessionStorage.getItem(activityKey(normalizedCaseId, stage, scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRuntimeActivity;
    if (!parsed?.caseId || !parsed?.stage || !Array.isArray(parsed?.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

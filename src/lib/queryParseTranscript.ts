export interface QueryParseActivityLine {
  id: string;
  timestamp?: string;
  text: string;
  tone?: "neutral" | "live" | "success" | "error";
  state?: "completed" | "active" | "upcoming" | "error";
  actor?: string;
  phase?: string;
  detail?: string;
  next?: string;
}

interface StoredQueryParseTranscript {
  caseId: string;
  runId: string;
  savedAt: number;
  lines: QueryParseActivityLine[];
}

const QUERY_PARSE_TRANSCRIPT_PREFIX = "query_parse_transcript_v1:";
const QUERY_PARSE_TRANSCRIPT_POINTER_PREFIX = "query_parse_transcript_latest_v1:";

function transcriptStorageKey(caseId: string, runId: string) {
  return `${QUERY_PARSE_TRANSCRIPT_PREFIX}${caseId}:${runId}`;
}

function transcriptPointerKey(caseId: string) {
  return `${QUERY_PARSE_TRANSCRIPT_POINTER_PREFIX}${caseId}`;
}

export function saveQueryParseTranscript(caseId: string, runId: string, lines: QueryParseActivityLine[]) {
  if (typeof window === "undefined" || !caseId || !runId || !lines.length) return;
  const payload: StoredQueryParseTranscript = {
    caseId,
    runId,
    savedAt: Date.now(),
    lines,
  };
  try {
    sessionStorage.setItem(transcriptStorageKey(caseId, runId), JSON.stringify(payload));
    sessionStorage.setItem(transcriptPointerKey(caseId), runId);
  } catch {
    // Ignore storage failures and continue with the result route.
  }
}

export function readQueryParseTranscript(caseId: string, runId?: string) {
  if (typeof window === "undefined" || !caseId) return null as StoredQueryParseTranscript | null;
  try {
    const resolvedRunId = runId || sessionStorage.getItem(transcriptPointerKey(caseId)) || "";
    if (!resolvedRunId) return null;
    const raw = sessionStorage.getItem(transcriptStorageKey(caseId, resolvedRunId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredQueryParseTranscript;
    if (!parsed?.caseId || !parsed?.runId || !Array.isArray(parsed?.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

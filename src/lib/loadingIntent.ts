export type LoadingIntentType = "query_parsing" | "run_all";

export interface LoadingIntent {
  type: LoadingIntentType;
  caseId?: string;
  draftKey?: string;
  createdAt: number;
}

const LOADING_INTENT_KEY = "agentic_loading_intent_v1";
const DEFAULT_INTENT_MAX_AGE_MS = 5 * 60 * 1000;

export function setLoadingIntent(intent: LoadingIntent) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LOADING_INTENT_KEY, JSON.stringify(intent));
}

export function getLoadingIntent(): LoadingIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LOADING_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LoadingIntent;
    if (!parsed || (parsed.type !== "query_parsing" && parsed.type !== "run_all")) return null;
    if (!Number.isFinite(Number(parsed.createdAt))) return null;
    return {
      type: parsed.type,
      caseId: parsed.caseId ? String(parsed.caseId) : undefined,
      draftKey: parsed.draftKey ? String(parsed.draftKey) : undefined,
      createdAt: Number(parsed.createdAt),
    };
  } catch {
    return null;
  }
}

export function clearLoadingIntent(match?: Partial<Pick<LoadingIntent, "type" | "caseId" | "draftKey">>) {
  if (typeof window === "undefined") return;
  if (!match) {
    sessionStorage.removeItem(LOADING_INTENT_KEY);
    return;
  }
  const current = getLoadingIntent();
  if (!current) return;
  if (match.type && current.type !== match.type) return;
  if (match.caseId && current.caseId !== match.caseId) return;
  if (match.draftKey && current.draftKey !== match.draftKey) return;
  sessionStorage.removeItem(LOADING_INTENT_KEY);
}

export function isFreshLoadingIntent(intent: LoadingIntent | null, maxAgeMs = DEFAULT_INTENT_MAX_AGE_MS) {
  if (!intent) return false;
  return Date.now() - intent.createdAt <= maxAgeMs;
}

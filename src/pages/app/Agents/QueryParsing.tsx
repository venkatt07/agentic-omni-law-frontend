import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/lib/magic-ui";
import {
  Filter,
  FileText,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "@/store";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { caseService, type QueryParseResult } from "@/services/caseService";
import { useLocation } from "wouter";
import PromptCanvasComposer from "@/components/app/PromptCanvasComposer";
import { resolveRole, roleUiConfig } from "@/lib/role-ui";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LanguagePreferenceSelect } from "@/components/app/LanguagePreferenceSelect";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useI18n } from "@/hooks/useI18n";
import { openAgentCase } from "@/lib/agentCaseNavigation";
import { SUGGESTED_CASE_PROMPTS, isUnfilledSuggestedPrompt } from "@/lib/suggestedPrompts";
import { setLoadingIntent } from "@/lib/loadingIntent";

const runSteps = [
  "Query Parsing",
  "Contract Risk + Dispute/Settlement",
  "Case Outcome + Deadline/Penalty",
  "Policy Compliance + Legal Risk Decision Support",
  "Legal Draft Generator + Evidence/Validation",
  "Final Consolidated Summary",
];

interface RecentCase {
  caseId: string;
  domain: string;
  domainPrimary?: string | null;
  domainSubtype?: string | null;
  title: string;
  status: "Active" | "Review" | "Drafting";
  lastUpdated: string;
  runCount?: number;
  successfulRunCount?: number;
  queryParsingRejected?: boolean;
  entryKind?: "case" | "session";
}

interface FiltersState {
  jurisdiction: string;
  legalDomain: string;
  dateRange: string;
  sourceTypes: string[];
}

function detectLanguagePreview(text: string): { label: string; code: string; confidence: number } | null {
  const sample = text.trim();
  if (!sample) return null;
  const counts: Record<string, number> = { hi: 0, ta: 0, te: 0, bn: 0, kn: 0, ml: 0, gu: 0, pa: 0, or: 0, ur: 0, en: 0 };
  for (const ch of sample.slice(0, 4000)) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0900 && code <= 0x097f) counts.hi++;
    else if (code >= 0x0b80 && code <= 0x0bff) counts.ta++;
    else if (code >= 0x0c00 && code <= 0x0c7f) counts.te++;
    else if (code >= 0x0980 && code <= 0x09ff) counts.bn++;
    else if (code >= 0x0c80 && code <= 0x0cff) counts.kn++;
    else if (code >= 0x0d00 && code <= 0x0d7f) counts.ml++;
    else if (code >= 0x0a80 && code <= 0x0aff) counts.gu++;
    else if (code >= 0x0a00 && code <= 0x0a7f) counts.pa++;
    else if (code >= 0x0b00 && code <= 0x0b7f) counts.or++;
    else if ((code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f) || (code >= 0x08a0 && code <= 0x08ff)) counts.ur++;
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) counts.en++;
  }
  const buckets = [
    { code: "hi", label: "Hindi", count: counts.hi },
    { code: "ta", label: "Tamil", count: counts.ta },
    { code: "te", label: "Telugu", count: counts.te },
    { code: "bn", label: "Bengali", count: counts.bn },
    { code: "kn", label: "Kannada", count: counts.kn },
    { code: "ml", label: "Malayalam", count: counts.ml },
    { code: "gu", label: "Gujarati", count: counts.gu },
    { code: "pa", label: "Punjabi", count: counts.pa },
    { code: "or", label: "Odia", count: counts.or },
    { code: "ur", label: "Urdu", count: counts.ur },
    { code: "en", label: "English", count: counts.en },
  ].sort((a, b) => b.count - a.count);
  if (!buckets[0].count) return null;
  const total = buckets.reduce((acc, b) => acc + b.count, 0);
  let confidence = total ? buckets[0].count / total : 0;
  confidence = Math.min(0.99, Math.max(buckets[0].code === "en" ? 0.7 : 0.85, 0.55 + confidence * 0.45));
  return { label: buckets[0].label, code: buckets[0].code, confidence };
}

function inferDomainPreview(query: string, selectedDomain: string) {
  if (isLikelyNonLegalOrLowSignalInput(query)) return null;
  if (selectedDomain && selectedDomain !== "All Domains") return selectedDomain;
  const q = query.toLowerCase();
  const checks: Array<[string, string[]]> = [
    ["Property / Succession / Partition", ["will", "partition", "succession", "inheritance", "property", "mother", "brother", "daughter", "house"]],
    ["Employment", ["employment", "employee", "salary", "pf", "gratuity", "hr", "manager", "termination", "terminated", "full & final"]],
    ["Commercial Contract / Supply", ["contract", "supplier", "distributor", "invoice", "payment", "outstanding", "arbitration", "termination"]],
    ["IP Law", ["trademark", "copyright", "patent", "infringement", "license"]],
    ["Consumer / Service Dispute", ["consumer", "refund", "defect", "service"]],
  ];
  let best: string | null = "Civil Litigation";
  let score = 0;
  for (const [label, terms] of checks) {
    const s = terms.reduce((acc, t) => acc + (q.includes(t) ? 1 : 0), 0);
    if (s > score) {
      score = s;
      best = label;
    }
  }
  return best;
}

function formatDomainLabel(primaryRaw: string, subtypeRaw: string) {
  const primary = String(primaryRaw || "").trim();
  const subtype = String(subtypeRaw || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!primary) return "";
  if (!subtype) return primary;
  return `${primary} / ${subtype}`;
}

function isLikelyNonLegalOrLowSignalInput(text: string): boolean {
  const q = (text || "").trim();
  if (!q) return false;
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const legalHints = [
    "case", "court", "judge", "petition", "plaintiff", "defendant", "notice", "injunction",
    "contract", "agreement", "breach", "dispute", "legal", "law", "complaint", "harassment",
    "property", "tenant", "landlord", "consumer", "refund", "arbitration", "payment",
    "invoice", "termination", "employment", "salary", "fir", "police",
  ];
  const legalHitCount = legalHints.reduce((acc, term) => acc + (q.toLowerCase().includes(term) ? 1 : 0), 0);
  const longRepeatedRun = /(.)\1{5,}/.test(q.replace(/\s+/g, ""));
  const alphabetic = (q.match(/[a-z]/gi) || []).length;
  const vowelCount = (q.match(/[aeiou]/gi) || []).length;
  const gibberishDense = alphabetic >= 12 && vowelCount <= Math.floor(alphabetic * 0.15);
  const tooShortForCase = tokens.length < 4 && q.length < 28;
  if (legalHitCount >= 1) return false;
  return longRepeatedRun || gibberishDense || tooShortForCase;
}

function dateRangeLabelToApi(label: string) {
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

const RECENT_CASES_KEY = "agentic_recent_cases";
const RECENT_QUERY_ACTIVITY_KEY = "agentic_recent_query_activity";
const MIN_RECENT_CASE_ITEMS = 2;
const SOURCE_TYPE_OPTIONS = [
  "Acts & Statutes",
  "Case Laws",
  "Regulations",
  "Legal Opinions",
];
const FILTERS_SESSION_KEY = "query_parse_filters_v1";
const QUERY_STATS_TIME_KEY = "query_parse_last_run_ms";
const QUERY_LOADING_DRAFT_PREFIX = "query_parse_loading_draft:";
const currentTimeLabel = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const loadRecentCases = (): RecentCase[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(RECENT_CASES_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as RecentCase[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }
    return parsed
      .filter((item) => !item?.queryParsingRejected)
      .slice(0, 5);
  } catch {
    return [];
  }
};

const recentCaseTime = (value: string) => {
  const timestamp = new Date(String(value || "")).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatRecentCaseTimestamp = (value: string) => {
  const timestamp = recentCaseTime(value);
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("en-IN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatCountLabel = (count: number | null | undefined, singular: string, plural = `${singular}s`) => {
  const safeCount = Math.max(0, Number(count || 0));
  const value = safeCount.toLocaleString("en-IN");
  return `${value} ${safeCount === 1 ? singular : plural}`;
};

const sortRecentCaseEntries = (items: RecentCase[]) =>
  [...items].sort((a, b) => recentCaseTime(b.lastUpdated) - recentCaseTime(a.lastUpdated));

const loadRecentQueryActivity = (): RecentCase[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(RECENT_QUERY_ACTIVITY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecentCase[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return sortRecentCaseEntries(
      parsed
        .filter((item) => !item?.queryParsingRejected)
        .map((item) => ({ ...item, entryKind: "session" as const })),
    ).slice(0, 12);
  } catch {
    return [];
  }
};

const saveRecentQueryActivity = (entry: RecentCase) => {
  if (typeof window === "undefined") return;
  const nextEntry: RecentCase = {
    ...entry,
    entryKind: "session",
    lastUpdated: entry.lastUpdated || new Date().toISOString(),
  };
  const merged = sortRecentCaseEntries([nextEntry, ...loadRecentQueryActivity()]).filter((item, index, arr) => {
    const key = `${item.entryKind || "session"}::${item.caseId}::${String(item.title || "").toLowerCase().trim()}::${recentCaseTime(item.lastUpdated)}`;
    return arr.findIndex((candidate) => {
      const candidateKey = `${candidate.entryKind || "session"}::${candidate.caseId}::${String(candidate.title || "").toLowerCase().trim()}::${recentCaseTime(candidate.lastUpdated)}`;
      return candidateKey === key;
    }) === index;
  });
  localStorage.setItem(RECENT_QUERY_ACTIVITY_KEY, JSON.stringify(merged.slice(0, 12)));
};

const buildRecentCaseDisplay = (cases: RecentCase[], activity: RecentCase[]) => {
  const mergedByCase = new Map<string, RecentCase>();

  const upsert = (item: RecentCase, nextKind: "case" | "session") => {
    const caseId = String(item.caseId || "").trim();
    if (!caseId) return;
    const existing = mergedByCase.get(caseId);
    const existingTime = existing ? recentCaseTime(existing.lastUpdated) : 0;
    const nextTime = recentCaseTime(item.lastUpdated);
    const keepNewerTime = nextTime >= existingTime;
    mergedByCase.set(caseId, {
      caseId,
      title: String(item.title || existing?.title || `Case ${caseId}`).trim() || `Case ${caseId}`,
      domain: String(item.domain || existing?.domain || "").trim(),
      domainPrimary: item.domainPrimary ?? existing?.domainPrimary ?? null,
      domainSubtype: item.domainSubtype ?? existing?.domainSubtype ?? null,
      status: existing?.status === "Active" || item.status === "Active"
        ? "Active"
        : item.status || existing?.status || "Drafting",
      lastUpdated: keepNewerTime ? item.lastUpdated : (existing?.lastUpdated || item.lastUpdated),
      runCount: Math.max(Number(existing?.runCount || 0), Number(item.runCount || 0)),
      successfulRunCount: Math.max(Number(existing?.successfulRunCount || 0), Number(item.successfulRunCount || 0)),
      queryParsingRejected: Boolean(existing?.queryParsingRejected || item.queryParsingRejected),
      entryKind: nextKind === "case" || existing?.entryKind === "case" ? "case" : "session",
    });
  };

  sortRecentCaseEntries(cases).forEach((item) => upsert(item, "case"));

  if (mergedByCase.size < Math.max(2, MIN_RECENT_CASE_ITEMS)) {
    sortRecentCaseEntries(activity).forEach((item) => {
      if (mergedByCase.has(String(item.caseId || "").trim())) return;
      upsert(item, "session");
    });
  }

  return sortRecentCaseEntries(
    Array.from(mergedByCase.values()).filter((item) => !item.queryParsingRejected),
  ).slice(0, Math.max(2, MIN_RECENT_CASE_ITEMS));
};

export default function QueryParsing() {
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.selectedRole);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const workspace = useAppStore((state) => state.caseWorkspace);
  const casesById = useAppStore((state) => state.casesById);
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, saving: savingLanguage, updateLanguage } = useLanguagePreference();
  const { t } = useI18n();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [recentCases, setRecentCases] = useState<RecentCase[]>(() => buildRecentCaseDisplay(loadRecentCases(), []));
  const [allCasesForStats, setAllCasesForStats] = useState<RecentCase[]>([]);
  const [parseResult, setParseResult] = useState<QueryParseResult | null>(null);
  const [runProgress, setRunProgress] = useState(0);
  const [runActive, setRunActive] = useState(false);
  const [runStepStates, setRunStepStates] = useState<Array<{ name: string; state: string; message?: string }>>([]);
  const [backgroundAgents, setBackgroundAgents] = useState<Record<string, { status: string; pct?: number; step?: string; reason?: string }>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<{ label: string; confidence?: number } | null>(null);
  const [previewDomain, setPreviewDomain] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [composerAttachments, setComposerAttachments] = useState<string[]>([]);
  const [lastRunDurationMs, setLastRunDurationMs] = useState<number | null>(null);
  const [statsSnapshot, setStatsSnapshot] = useState<{ analyzed_cases: number; analyzed_unique_cases?: number; total_runs: number; successful_runs: number; success_rate: number } | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [mode, setMode] = useState<"ready" | "loading" | "empty" | "error">("ready");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    jurisdiction: "All India",
    legalDomain: "All Domains",
    dateRange: "Last 12 months",
    sourceTypes: [...SOURCE_TYPE_OPTIONS],
  });
  const autoStartedRef = useRef(false);
  const urlInitHandledRef = useRef(false);
  const activeRole = resolveRole(role);
  const roleConfig = roleUiConfig[activeRole];

  const refreshRecentCases = useCallback(async () => {
    try {
      const [rows, stats] = await Promise.all([
        caseService.listCases(),
        caseService.getQueryParsingStats().catch(() => null),
      ]);
      const sorted = [...rows].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
      const mapped = sorted.map((r) => {
        const status: RecentCase["status"] =
          (String((r as any).status || "").toLowerCase() === "active")
            ? "Active"
            : (r.last_run_status === "FAILED" ? "Review" : "Drafting");
        return {
        caseId: r.case_id,
        domain: r.domain || "",
        domainPrimary: (r as any).domain_primary || null,
        domainSubtype: (r as any).domain_subtype || null,
        title: r.title,
        status,
        lastUpdated: new Date(r.updated_at).toISOString(),
        runCount: r.run_count || 0,
        successfulRunCount: r.successful_run_count || 0,
        queryParsingRejected: !!(r as any).query_parsing_rejected,
      };
      });
      const visibleCases = mapped.filter((item) => !item.queryParsingRejected);
      const recentActivity = loadRecentQueryActivity();
      setAllCasesForStats(visibleCases);
      setRecentCases(buildRecentCaseDisplay(visibleCases, recentActivity));
      if (stats) setStatsSnapshot(stats);
      setStatsLoaded(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(RECENT_CASES_KEY, JSON.stringify(visibleCases.slice(0, 12)));
      }
    } catch {
      // keep local snapshot if API list refresh fails
      setAllCasesForStats((prev) => (prev.length ? prev : []));
      setStatsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const currentCase = activeCaseId ? casesById[activeCaseId] : null;
    const nextParse = currentCase?.outputs.query_parse ?? null;

    setParseResult((prev) => (prev === nextParse ? prev : nextParse));
  }, [activeCaseId, casesById]);

  useEffect(() => {
    if (!activeCaseId) return;
    void caseService.fetchCase(activeCaseId).catch(() => undefined);
  }, [activeCaseId]);

  useEffect(() => {
    void refreshRecentCases();
  }, [casesById, refreshRecentCases]);

  useEffect(() => {
    const onFocus = () => {
      void refreshRecentCases();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshRecentCases]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshRecentCases();
    }, 8000);
    return () => window.clearInterval(intervalId);
  }, [refreshRecentCases]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(`${QUERY_STATS_TIME_KEY}:${activeCaseId || "global"}`);
    setLastRunDurationMs(raw ? Number(raw) || null : null);
  }, [activeCaseId]);

  useEffect(() => {
    // New case / page reload should not show historical workspace docs as "currently attached" in the composer.
    setComposerAttachments([]);
  }, [activeCaseId]);
  useEffect(() => {
    // Hard reset on first mount as well (covers refresh/snapshot restore edge cases).
    setComposerAttachments([]);
  }, []);

  const analyzeQuery = async (providedQuery?: string) => {
    if (uploadingFiles.length > 0) {
      toast({
        title: "Upload in progress",
        description: "Please wait until document upload completes before sending the query.",
      });
      return;
    }
    const queryText = (providedQuery || query).trim();
    const hasUploadedDocs = uploadedFiles.length > 0 || workspaceFiles.length > 0;
    if (!queryText && !hasUploadedDocs) return;
    if (queryText && !hasUploadedDocs && isUnfilledSuggestedPrompt(queryText)) {
      toast({
        title: "Update the prompt",
        description:
          "This looks like an old fill-in template. Use one of the updated predefined prompts or replace it with a factual case description.",
        variant: "destructive",
      });
      return;
    }
    if (queryText && !hasUploadedDocs && isLikelyNonLegalOrLowSignalInput(queryText)) {
      toast({
        title: "Legal case input required",
        description:
          "This input looks unrelated/low-signal for legal analysis. Enter a real legal dispute summary or upload case documents.",
        variant: "destructive",
      });
      return;
    }
    setAnalyzing(true);
    try {
      const currentRunAttachments = [...composerAttachments];
      if (typeof window !== "undefined") {
        sessionStorage.setItem(FILTERS_SESSION_KEY, JSON.stringify(filters));
      }
      const effectivePreviewLanguage = !isShortDraftQuery
        ? (
            previewLanguage
              ? { label: previewLanguage.label, confidence: previewLanguage.confidence }
              : (localLanguagePreview && currentDraftQuery.length >= 25
                ? { label: localLanguagePreview.label, confidence: localLanguagePreview.confidence }
                : null)
          )
        : null;
      const effectivePreviewDomain =
        !isShortDraftQuery && !isLikelyNonLegalOrLowSignalInput(currentDraftQuery)
          ? (previewDomain || (currentDraftQuery.length >= 25 ? localDomainPreview : null))
          : null;
      const loadingParams = new URLSearchParams({
        ...(activeCaseId ? { caseId: activeCaseId } : {}),
      });
      const draftKey = `${activeCaseId || "new"}:${Date.now()}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `${QUERY_LOADING_DRAFT_PREFIX}${draftKey}`,
          JSON.stringify({
            query: queryText,
            attachedDocs: currentRunAttachments,
          }),
        );
        setLoadingIntent({
          type: "query_parsing",
          caseId: activeCaseId || undefined,
          draftKey,
          createdAt: Date.now(),
        });
      }
      loadingParams.set("draftKey", draftKey);
      if (effectivePreviewLanguage?.label) loadingParams.set("previewLang", effectivePreviewLanguage.label);
      if (typeof effectivePreviewLanguage?.confidence === "number") {
        loadingParams.set("previewLangConf", String(effectivePreviewLanguage.confidence));
      }
      if (effectivePreviewDomain) loadingParams.set("previewDomain", effectivePreviewDomain);
      const loadingHref = `/app/agents/query/loading?${loadingParams.toString()}`;
      setLocation(loadingHref, { replace: true } as never);
    } catch (error) {
      toast({
        title: "Could not start analysis",
        description: error instanceof Error ? error.message : "Please retry. If this persists, check backend connectivity.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || urlInitHandledRef.current) return;
    urlInitHandledRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const caseIdFromUrl = params.get("caseId");
    const queryFromUrl = params.get("query");
    const autostart = params.get("autostart") === "1";

    if (caseIdFromUrl && activeCaseId !== caseIdFromUrl) {
      const title = casesById[caseIdFromUrl]?.title || workspace.title || "Query Parsing Workspace";
      setCaseWorkspace(caseIdFromUrl, title);
    }
    if (queryFromUrl && queryFromUrl !== query) {
      setQuery(queryFromUrl);
    }
    if (autostart && queryFromUrl && queryFromUrl.trim().length > 0) {
      autoStartedRef.current = true;
      void analyzeQuery(queryFromUrl);
    }
  }, [activeCaseId, casesById, setCaseWorkspace, workspace.title]);

  const appliedFilterChips = useMemo(() => {
    return [
      filters.jurisdiction,
      filters.legalDomain,
      filters.dateRange,
      ...filters.sourceTypes,
    ];
  }, [filters]);
  const localLanguagePreview = useMemo(() => {
    const text = query.trim();
    if (!text) return null;
    return detectLanguagePreview(text);
  }, [query]);
  const localDomainPreview = useMemo(
    () => {
      const text = query.trim();
      return text ? inferDomainPreview(text, filters.legalDomain) : null;
    },
    [filters.legalDomain, query],
  );

  useEffect(() => {
    let cancelled = false;
    const text = query.trim();
    if (!text) {
      setPreviewing(false);
      setPreviewLanguage(null);
      setPreviewDomain(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      setPreviewing(true);
      setPreviewLanguage(null);
      setPreviewDomain(null);
      try {
        if (text.length < 25 || isLikelyNonLegalOrLowSignalInput(text)) return;
        const caseId = activeCaseId || (await caseService.ensureCase("Query Parsing Workspace"));
        if (cancelled) return;
        const preview = await caseService.previewQueryParse(caseId, text, {
          jurisdiction: filters.jurisdiction,
          legalDomain: filters.legalDomain,
          dateRange: filters.dateRange,
          sourceTypes: filters.sourceTypes,
        } as any);
        if (cancelled) return;
        setPreviewLanguage(
          preview.detectedLanguage
            ? { label: preview.detectedLanguage, confidence: preview.detectedLanguageConfidence }
            : null,
        );
        const resolvedDomain = String(preview.legalDomain || preview.domain || "").trim();
        setPreviewDomain(resolvedDomain && !/^general$/i.test(resolvedDomain) ? resolvedDomain : null);
      } catch {
        // fall back to local previews below
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, activeCaseId, filters.jurisdiction, filters.legalDomain, filters.dateRange, filters.sourceTypes]);

  const selectCaseWorkspace = (item: RecentCase) => {
    void openAgentCase({
      agentKey: "query_parsing",
      caseId: item.caseId,
      title: item.title,
      setLocation,
    });
  };

  const recordRecentQueryActivity = useCallback((caseId: string, details?: Awaited<ReturnType<typeof caseService.fetchCase>> | null) => {
    const fallbackCase = casesById[caseId] as any;
    const nextTitle =
      String(details?.title || fallbackCase?.title || workspace.title || `Case ${caseId}`).trim() || `Case ${caseId}`;
    const nextDomainPrimary = String(details?.domain_primary || fallbackCase?.domainPrimary || "").trim() || null;
    const nextDomainSubtype = String(details?.domain_subtype || fallbackCase?.domainSubtype || "").trim() || null;
    saveRecentQueryActivity({
      caseId,
      title: nextTitle,
      domain: formatDomainLabel(nextDomainPrimary || "", nextDomainSubtype || "") || nextDomainPrimary || "General",
      domainPrimary: nextDomainPrimary,
      domainSubtype: nextDomainSubtype,
      status: "Review",
      lastUpdated: new Date().toISOString(),
      runCount: 0,
      successfulRunCount: 0,
      queryParsingRejected: false,
      entryKind: "session",
    });
  }, [casesById, workspace.title]);

  const openUploadPicker = () => {
    // Keep file-picker click inside the direct user gesture to avoid browser popup blocking.
    uploadInputRef.current?.click();
    void (async () => {
      const caseId = await caseService.ensureCase("Query Parsing Workspace");
      const title = casesById[caseId]?.title || workspace.title || "Query Parsing Workspace";
      setCaseWorkspace(caseId, title);
    })();
  };

  const handleDirectUpload = async (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    try {
      setUploadingFiles(files.map((f) => f.name));
      const caseId = await caseService.ensureCase("Query Parsing Workspace");
      await caseService.uploadFiles(caseId, files, { addToWorkspace: false });
      await caseService.fetchCase(caseId);
      await refreshRecentCases();
      // User just selected/uploaded these docs from the composer: keep them as current run attachments.
      setComposerAttachments((prev) => {
        const next = [...prev];
        for (const f of files.map((x) => x.name)) {
          if (!next.some((n) => n.toLowerCase() === f.toLowerCase())) next.push(f);
        }
        return next;
      });
      toast({
        title: "Documents uploaded",
        description: `${files.length} file${files.length > 1 ? "s" : ""} added and selected for this run.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload documents.",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles([]);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const runAllAgents = async () => {
    setRunActive(true);
    setRunProgress(0);
    setBackgroundAgents({});
    const startedAt = Date.now();
    try {
      const caseId = await caseService.ensureCase("Query Parsing Workspace");
      setCaseWorkspace(caseId, casesById[caseId]?.title || workspace.title || "Query Parsing Workspace");
      if (query.trim()) {
        void caseService.saveQuery(caseId, query.trim()).catch(() => undefined);
      }
      const started = await caseService.startRun(caseId, {
        jurisdiction: filters.jurisdiction,
        state: filters.jurisdiction === "Tamil Nadu" ? "Tamil Nadu" : undefined,
        legal_domain: filters.legalDomain,
        date_range: dateRangeLabelToApi(filters.dateRange),
        source_types: filters.sourceTypes,
      }, query.trim());
      const runId = started.run_id || started.runs?.query_parsing;
      const runAllId = started.run_all_id;
      let completed = false;
      while (!completed) {
        if (runAllId) {
          const agg = await caseService.getRunAllStatus(caseId, runAllId);
          const agents = agg.agents || {};
          setBackgroundAgents(Object.fromEntries(Object.entries(agents).map(([k, v]) => [k, { status: String(v.status || ""), pct: Number(v.pct || 0), step: String(v.step || ""), reason: (v as any).reason }])) as any);
          const qp = agents.query_parsing;
          const cr = agents.contract_risk_dispute_settlement;
          const co = agents.case_outcome_deadline_penalty;
          const pseudoSteps = [
            { name: "query_parsing", state: qp?.status === "done" ? "SUCCEEDED" : qp?.status === "error" ? "FAILED" : "RUNNING", progress: Number(qp?.pct || 0) },
            { name: "contract_risk_dispute_settlement", state: cr?.status === "done" ? "SUCCEEDED" : cr?.status === "error" || cr?.status === "blocked" ? "FAILED" : cr?.status === "running" ? "RUNNING" : "PENDING", progress: Number(cr?.pct || 0) },
            { name: "case_outcome_deadline_penalty", state: co?.status === "done" ? "SUCCEEDED" : co?.status === "error" || co?.status === "blocked" ? "FAILED" : co?.status === "running" ? "RUNNING" : "PENDING", progress: Number(co?.pct || 0) },
          ];
          setRunStepStates(pseudoSteps as any);
          const pct = Math.round((pseudoSteps.reduce((acc, s) => acc + Number(s.progress || 0), 0)) / Math.max(1, pseudoSteps.length));
          setRunProgress(Math.min(100, pct));
          if (agg.overall_status === "done") {
            const details = await caseService.fetchCase(caseId);
            recordRecentQueryActivity(caseId, details);
            await refreshRecentCases();
            setRunProgress(100);
            const durationMs = Date.now() - startedAt;
            setLastRunDurationMs(durationMs);
            if (typeof window !== "undefined") localStorage.setItem(`${QUERY_STATS_TIME_KEY}:${caseId}`, String(durationMs));
            completed = true;
            break;
          }
          if (agg.overall_status === "error") throw new Error("Run failed. Check agent statuses and retry.");
        } else if (runId) {
          const status = await caseService.getRunStatus(runId);
          setRunStepStates(status.steps || []);
          const maxProgress = Math.max(0, ...(status.steps || []).map((s) => Number(s.progress || 0)));
          setRunProgress(Math.min(100, maxProgress));
          if (status.status === "SUCCEEDED") {
            const details = await caseService.fetchCase(caseId);
            recordRecentQueryActivity(caseId, details);
            await refreshRecentCases();
            setRunProgress(100);
            const durationMs = Date.now() - startedAt;
            setLastRunDurationMs(durationMs);
            if (typeof window !== "undefined") localStorage.setItem(`${QUERY_STATS_TIME_KEY}:${caseId}`, String(durationMs));
            completed = true;
            break;
          }
          if (status.status === "FAILED") throw new Error("Run failed. Check uploaded content and retry.");
        } else {
          throw new Error("No run identifier returned");
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    } finally {
      setRunActive(false);
    }
  };

  const toggleSourceType = (value: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      sourceTypes: checked
        ? [...prev.sourceTypes, value]
        : prev.sourceTypes.filter((v) => v !== value),
    }));
  };

  const selectedCase =
    (activeCaseId && casesById[activeCaseId]) ||
    (workspace.caseId ? casesById[workspace.caseId] : undefined);
  const currentSavedQuery = (selectedCase?.lastQuery || "").trim();
  const currentDraftQuery = query.trim();
  const isNonLegalDraftInput = currentDraftQuery.length > 0 && isLikelyNonLegalOrLowSignalInput(currentDraftQuery);
  const hasRealUserInput = currentDraftQuery.length > 0;
  const isShortDraftQuery = currentDraftQuery.length > 0 && currentDraftQuery.length < 25;
  const hasInputInComposer = hasRealUserInput;
  const isEditingNewQuery =
    currentDraftQuery.length > 0 &&
    (currentDraftQuery !== currentSavedQuery || currentDraftQuery.length < 25);
  const workspaceFiles = (selectedCase?.uploadedDocuments || []).filter(Boolean);
  const uploadedFiles = composerAttachments;
  const latestRiskCount = parseResult?.highlights?.length ?? 0;
  const successRate =
    typeof statsSnapshot?.success_rate === "number"
      ? Math.max(0, Math.min(100, statsSnapshot.success_rate))
      : null;
  const estimatedProcessingTimeLabel = runActive
    ? `${Math.max(5, Math.ceil(((100 - runProgress) / 100) * 45))}s`
    : lastRunDurationMs
      ? `${(lastRunDurationMs / 1000).toFixed(1)}s`
      : "—";
  const totalQueryRunsCount =
    typeof statsSnapshot?.total_runs === "number"
      ? Math.max(0, statsSnapshot.total_runs)
      : allCasesForStats.length
        ? allCasesForStats.reduce((acc, item) => acc + Math.max(0, Number(item.runCount || 0)), 0)
        : (!statsLoaded && parseResult && activeCaseId ? 1 : null);
  const queryStats = [
    {
      label: "Query Runs",
      value: totalQueryRunsCount == null ? "—" : Number(totalQueryRunsCount).toLocaleString("en-IN"),
      icon: FileText,
      iconClass: "bg-cyan-500/10 text-cyan-500",
    },
    {
      label: "Processing Time",
      value: estimatedProcessingTimeLabel,
      icon: Clock3,
      iconClass: "bg-slate-500/10 text-slate-500",
    },
    {
      label: "Success Rate",
      value: successRate == null ? "—" : `${successRate}%`,
      icon: TrendingUp,
      iconClass: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Risks Identified",
      value: String(Math.max(latestRiskCount, parseResult?.issueGroups?.length ?? 0, parseResult?.keyFacts?.threats?.length ?? 0)),
      icon: AlertTriangle,
      iconClass: "bg-orange-500/10 text-orange-500",
    },
  ];
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 md:space-y-6">
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={(event) => void handleDirectUpload(event.target.files)}
      />
      <FadeIn>
        <div className="space-y-5 px-1 py-1 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading">Query Parsing</h1>
            <p className="text-muted-foreground mt-1">
              Parse legal intent, detect domain and jurisdiction, and ground the matter with relevant authorities.
            </p>
            <div className="mt-3 text-sm text-muted-foreground">
              {activeCaseId ? (
                <>
                  Using current case: <span className="font-mono text-primary">{activeCaseId}</span>
                </>
              ) : (
                "No case workspace selected yet."
              )}
            </div>
          </div>

          <PromptCanvasComposer
            title="Describe Your Legal Issue"
            subtitle="Parse legal intent, detect domain and jurisdiction, and ground the matter with relevant authorities."
            showHeader={false}
            value={query}
            onValueChange={setQuery}
            onSubmit={(value) => void analyzeQuery(value)}
            onUploadClick={() => void openUploadPicker()}
            onFocusChange={setComposerFocused}
            hints={roleConfig.quickQueryHints}
            uploadedFiles={uploadedFiles}
            uploadingFiles={uploadingFiles}
            availableWorkspaceFiles={workspaceFiles}
            onToggleWorkspaceFile={(name) =>
              setComposerAttachments((prev) =>
                prev.includes(name) ? prev.filter((file) => file !== name) : [...prev, name],
              )
            }
            onRemoveUploadedFile={(name) =>
              setComposerAttachments((prev) => prev.filter((f) => f !== name))
            }
            workspaceFileCount={workspaceFiles.length}
            viewAllHref={activeCaseId ? `/app/documents/my?caseId=${encodeURIComponent(activeCaseId)}` : "/app/documents/my"}
            submitting={analyzing}
            showWorkspaceFooter={false}
          />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {appliedFilterChips.map((chip) => (
                <Badge key={chip} variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] font-medium md:text-[11px]">
                  {chip}
                </Badge>
              ))}
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 rounded-full gap-1.5 px-3 text-[11px]">
                    <Filter className="h-3.5 w-3.5" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[380px] sm:w-[420px]">
                  <SheetHeader>
                    <SheetTitle>Filter Case Context</SheetTitle>
                    <SheetDescription>Refine legal context sources for query parsing.</SheetDescription>
                  </SheetHeader>

                  <div className="space-y-5 mt-6">
                    <div className="space-y-2">
                      <Label>Jurisdiction</Label>
                      <Select value={filters.jurisdiction} onValueChange={(v) => setFilters((p) => ({ ...p, jurisdiction: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select jurisdiction" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All India">All India</SelectItem>
                          <SelectItem value="Delhi">Delhi</SelectItem>
                          <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                          <SelectItem value="Karnataka">Karnataka</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Legal Domain</Label>
                      <Select value={filters.legalDomain} onValueChange={(v) => setFilters((p) => ({ ...p, legalDomain: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select legal domain" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Domains">All Domains</SelectItem>
                          <SelectItem value="Civil Litigation">Civil Litigation</SelectItem>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                          <SelectItem value="Employment">Employment</SelectItem>
                          <SelectItem value="IP Law">IP Law</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Select value={filters.dateRange} onValueChange={(v) => setFilters((p) => ({ ...p, dateRange: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Last 3 months">Last 3 months</SelectItem>
                          <SelectItem value="Last 6 months">Last 6 months</SelectItem>
                          <SelectItem value="Last 12 months">Last 12 months</SelectItem>
                          <SelectItem value="All time">All time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Source Types</Label>
                      {SOURCE_TYPE_OPTIONS.map((option) => (
                        <div key={option} className="flex items-center gap-3">
                          <Checkbox
                            id={option}
                            checked={filters.sourceTypes.includes(option)}
                            onCheckedChange={(checked) => toggleSourceType(option, checked === true)}
                          />
                          <Label htmlFor={option}>{option}</Label>
                        </div>
                      ))}
                    </div>

                    <Button className="w-full" onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 md:gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("query.suggestedTopics")}
                </span>
                {SUGGESTED_CASE_PROMPTS.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    className="rounded-full border border-border/55 bg-background/50 px-2.5 py-1 text-[11px] text-foreground transition-colors hover:border-primary/35 hover:text-primary"
                    onClick={() => setQuery(item.prompt)}
                    aria-label={`Use suggested topic ${item.label}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {t("query.multilingualHint")}
              </div>
            </div>

            {hasInputInComposer ? (
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] md:text-[11px]">
                  {previewing || isShortDraftQuery ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {t("query.languageBadge", {
                    value:
                      isShortDraftQuery
                        ? t("query.keepTyping")
                        : previewLanguage
                        ? `${previewLanguage.label}${typeof previewLanguage.confidence === "number" ? ` (${Math.round(previewLanguage.confidence * 100)}%)` : ""}`
                        : localLanguagePreview && currentDraftQuery.length >= 25
                          ? `${localLanguagePreview.label}${!previewing ? ` (${Math.round(localLanguagePreview.confidence * 100)}%)` : ""}`
                          : t("query.analyzing"),
                  })}
                </Badge>
                {isNonLegalDraftInput ? (
                  <Badge variant="destructive" className="gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] md:text-[11px]">
                    <AlertTriangle className="h-3 w-3" />
                    {t("query.nonLegalInput")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] md:text-[11px]">
                    {previewing || isShortDraftQuery ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {t("query.domainBadge", {
                      value:
                        isShortDraftQuery
                          ? t("query.keepTyping")
                          : (previewDomain || (currentDraftQuery.length >= 25 ? localDomainPreview : null) || t("query.analyzing")),
                    })}
                  </Badge>
                )}
              </div>
            ) : null}
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-semibold font-heading">{t("query.workspaceActivity")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("query.workspaceHelp")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5">
                  {t("query.promptFirst")}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {t("query.liveCaseContext")}
                </Badge>
              </div>
            </div>

            <Card className="border-border/60 bg-card/85 p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] md:items-center">
                <div>
                  <h3 className="text-base md:text-lg font-semibold font-heading">{t("query.nativeLanguageOutput")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("query.nativeLanguageHelp")}
                  </p>
                </div>
                <LanguagePreferenceSelect
                  value={language}
                  pending={savingLanguage}
                  label={t("common.preferredLanguage")}
                  helperText=""
                  onChange={async (nextLanguage) => {
                    await updateLanguage(nextLanguage);
                    if (activeCaseId) {
                      void caseService.fetchCase(activeCaseId).catch(() => undefined);
                    }
                  }}
                />
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card className="overflow-hidden border-border/60 bg-card/85">
                <div className="border-b border-border/50 px-4 py-4 md:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold font-heading">{t("query.runSnapshot")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("query.runSnapshotHelp")}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">Live</Badge>
                  </div>
                </div>
                <div className="grid gap-px bg-border/50 sm:grid-cols-2">
                  {queryStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-background/55 px-4 py-4 transition-colors hover:bg-background/70 md:px-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.iconClass)}>
                          <stat.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/90">
                            {stat.label}
                          </p>
                          <div className="mt-2 text-2xl font-bold leading-none tracking-tight md:text-[1.9rem]">
                            {stat.value}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-border/60 bg-card/85 p-4 md:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base md:text-lg font-semibold font-heading">{t("query.previousCases")}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("query.previousCasesHelp")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Continue
                  </span>
                </div>

                {recentCases.slice(0, 2).length ? (
                  <div className="space-y-2.5">
                    {recentCases.slice(0, 2).map((item) => (
                      <button
                        key={`${item.entryKind || "case"}-${item.caseId}-${recentCaseTime(item.lastUpdated)}`}
                        type="button"
                        onClick={() => selectCaseWorkspace(item)}
                        className="group block w-full rounded-2xl border border-border/55 bg-background/40 p-3.5 text-left transition-all hover:border-primary/55 hover:bg-background/70"
                        aria-label={`Use case ${item.caseId}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="max-w-full truncate font-mono text-[11px] text-muted-foreground">
                                {item.caseId}
                              </p>
                              {activeCaseId === item.caseId ? (
                                <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 text-primary">
                                  Active
                                </Badge>
                              ) : null}
                            </div>
                            <h4
                              className="mt-2 line-clamp-1 font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
                              title={item.title}
                            >
                              {item.title}
                            </h4>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {item.status}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(() => {
                            const primary = String(item.domainPrimary || item.domain || "").trim();
                            const subtype = String(item.domainSubtype || "").trim();
                            const hideDomain =
                              (!primary || /^general$/i.test(primary)) &&
                              (!subtype || /^unknown$/i.test(subtype));
                            if (hideDomain) return null;
                            const label = formatDomainLabel(primary, subtype);
                            return (
                              <Badge
                                variant="secondary"
                                className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                                title={label}
                              >
                                {label}
                              </Badge>
                            );
                          })()}
                          <Badge variant="secondary">
                            {formatCountLabel(item.successfulRunCount, "successful run")}
                          </Badge>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{formatRecentCaseTimestamp(item.lastUpdated)}</span>
                          <span>{formatCountLabel(item.runCount, "total run")}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={t("query.noPreviousCases")}
                    description={t("query.noPreviousCasesHelp")}
                  />
                )}
              </Card>
            </div>
          </section>

        </div>
      </FadeIn>

      {runActive || runProgress > 0 ? (
        <FadeIn delay={0.18}>
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Run All Agents Progress</h3>
              <span className="text-sm text-muted-foreground">{runProgress}%</span>
            </div>
            <Progress value={runProgress} />
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              {(runStepStates.length ? runStepStates.map((s) => s.name) : runSteps).map((step, idx) => {
                const backendStep = runStepStates[idx];
                const isDone = backendStep ? backendStep.state === "SUCCEEDED" : runProgress >= ((idx + 1) / runSteps.length) * 100;
                const isRunning = backendStep ? backendStep.state === "RUNNING" : runActive;
                return (
                  <div key={step} className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={isDone ? "text-foreground" : "text-muted-foreground"}>
                      {step}
                      {backendStep?.message ? <span className="ml-2 text-xs text-muted-foreground">({backendStep.message})</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
            {Object.keys(backgroundAgents).length ? (
              <div className="pt-2 border-t border-border/60">
                <div className="text-sm font-medium mb-2">Background Agent Status</div>
                <div className="grid md:grid-cols-3 gap-2 text-xs">
                  {[
                    ["query_parsing", "Query Parsing"],
                    ["contract_risk_dispute_settlement", "Contract Risk Review AI"],
                    ["case_outcome_deadline_penalty", "Case Outcome Projection"],
                  ].map(([key, label]) => {
                    const a = backgroundAgents[key];
                    return (
                      <div key={key} className="rounded-md border p-2">
                        <div className="font-medium">{label}</div>
                        <div className="text-muted-foreground mt-1">
                          {a ? `${a.status}${typeof a.pct === "number" ? ` • ${a.pct}%` : ""}${a.step ? ` • ${a.step}` : ""}` : "Queued"}
                        </div>
                        {a?.reason ? <div className="text-destructive mt-1">{a.reason}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </Card>
        </FadeIn>
      ) : null}

      {mode === "loading" ? (
        <LoadingState title="Loading query context" description="Preparing uploaded documents." />
      ) : null}
      {mode === "empty" ? (
        <EmptyState
          title="No documents uploaded"
          description="Upload at least one document to establish your case workspace."
          actionLabel="Upload Document"
          onAction={() => void openUploadPicker()}
        />
      ) : null}
      {mode === "error" ? (
        <ErrorState
          title="Upload module failed"
          description="Unable to reach storage. Retry to continue."
          actionLabel="Retry"
          onAction={() => setMode("ready")}
        />
      ) : null}

    </div>
  );
}




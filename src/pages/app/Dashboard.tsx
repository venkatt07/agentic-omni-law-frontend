import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/lib/magic-ui";
import { ErrorState, LoadingState } from "@/components/app/PageState";
import ClickableCard from "@/components/app/ClickableCard";
import PromptCanvasComposer from "@/components/app/PromptCanvasComposer";
import { resolveRole, roleUiConfig } from "@/lib/role-ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { caseService } from "@/services/caseService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";
import { autoTranslateUiText } from "@/lib/i18n";
import { SUGGESTED_CASE_PROMPTS, isUnfilledSuggestedPrompt } from "@/lib/suggestedPrompts";
import { setLoadingIntent } from "@/lib/loadingIntent";

const DASHBOARD_RUN_DRAFT_PREFIX = "dashboard_run_loading_draft:";
const AGENT_CARD_ART: Record<
  string,
  {
    light: string;
    dark: string;
  }
> = {
  "Step-by-step Guidance": {
    light:
      "bg-[radial-gradient(18rem_12rem_at_18%_28%,rgba(251,191,36,0.28),transparent_55%),radial-gradient(18rem_12rem_at_84%_22%,rgba(96,165,250,0.24),transparent_56%),linear-gradient(135deg,rgba(255,248,235,0.96),rgba(237,244,255,0.9)_46%,rgba(255,238,246,0.9))]",
    dark:
      "dark:bg-[radial-gradient(18rem_12rem_at_18%_28%,rgba(245,158,11,0.22),transparent_55%),radial-gradient(18rem_12rem_at_84%_22%,rgba(59,130,246,0.18),transparent_56%),linear-gradient(135deg,rgba(17,14,10,0.94),rgba(13,18,30,0.92)_46%,rgba(24,11,23,0.92))]",
  },
  "Cost Factor": {
    light:
      "bg-[radial-gradient(18rem_12rem_at_22%_24%,rgba(34,197,94,0.22),transparent_56%),radial-gradient(20rem_12rem_at_82%_74%,rgba(56,189,248,0.2),transparent_58%),linear-gradient(135deg,rgba(240,251,243,0.96),rgba(238,247,255,0.9)_50%,rgba(246,242,255,0.88))]",
    dark:
      "dark:bg-[radial-gradient(18rem_12rem_at_22%_24%,rgba(34,197,94,0.16),transparent_56%),radial-gradient(20rem_12rem_at_82%_74%,rgba(56,189,248,0.14),transparent_58%),linear-gradient(135deg,rgba(10,18,13,0.94),rgba(11,18,26,0.92)_50%,rgba(16,12,23,0.92))]",
  },
  "Family Connect & Explain": {
    light:
      "bg-[radial-gradient(18rem_12rem_at_22%_26%,rgba(244,114,182,0.24),transparent_56%),radial-gradient(18rem_12rem_at_82%_22%,rgba(251,191,36,0.22),transparent_56%),linear-gradient(135deg,rgba(255,241,246,0.96),rgba(255,248,236,0.92)_48%,rgba(242,246,255,0.88))]",
    dark:
      "dark:bg-[radial-gradient(18rem_12rem_at_22%_26%,rgba(236,72,153,0.18),transparent_56%),radial-gradient(18rem_12rem_at_82%_22%,rgba(245,158,11,0.16),transparent_56%),linear-gradient(135deg,rgba(24,10,18,0.94),rgba(26,16,10,0.92)_48%,rgba(11,16,24,0.9))]",
  },
  "Query Parsing": {
    light:
      "bg-[radial-gradient(20rem_12rem_at_22%_70%,rgba(59,130,246,0.22),transparent_56%),radial-gradient(18rem_12rem_at_82%_24%,rgba(168,85,247,0.2),transparent_56%),linear-gradient(135deg,rgba(238,246,255,0.96),rgba(245,240,255,0.9)_52%,rgba(255,244,248,0.86))]",
    dark:
      "dark:bg-[radial-gradient(20rem_12rem_at_22%_70%,rgba(59,130,246,0.16),transparent_56%),radial-gradient(18rem_12rem_at_82%_24%,rgba(168,85,247,0.16),transparent_56%),linear-gradient(135deg,rgba(10,14,24,0.94),rgba(18,10,28,0.92)_52%,rgba(24,11,18,0.9))]",
  },
};

export default function Dashboard() {
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.selectedRole);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const caseWorkspace = useAppStore((state) => state.caseWorkspace);
  const casesById = useAppStore((state) => state.casesById);
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const [, setLocation] = useLocation();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const heroSurfaceRef = useRef<HTMLElement | null>(null);
  const heroPointerFrameRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();
  const translateUi = useCallback(
    (value: string) => autoTranslateUiText(value, useAppStore.getState().language),
    [],
  );

  const [mode, setMode] = useState<"ready" | "loading" | "error">("ready");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [quickQuerySubmitting, setQuickQuerySubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [heroQuery, setHeroQuery] = useState("");
  const [selectedWorkspaceFiles, setSelectedWorkspaceFiles] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    active_contracts: number;
    active_contracts_delta_week: number;
    high_risk_cases: number;
    high_risk_delta_week: number;
    compliance_score: number;
    compliance_delta_month: number;
    resolution_rate: number;
    resolution_delta_month: number;
  } | null>(null);
  const [recentCases, setRecentCases] = useState<
    Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      risk: string;
      isActive?: boolean;
      hasAutomatedReport?: boolean;
    }>
  >([]);

  const activeRole = resolveRole(role);
  const roleConfig = roleUiConfig[activeRole];
  const activeCase = activeCaseId ? casesById[activeCaseId] : undefined;
  const workspaceUploadedFiles =
    activeCase?.uploadedDocuments ||
    (caseWorkspace.caseId === activeCaseId ? caseWorkspace.uploadedDocuments : []);

  const refreshDashboardData = useCallback(async () => {
    const results = await Promise.allSettled([caseService.listCases(), caseService.getDashboardStats()]);
    const rows = results[0].status === "fulfilled" ? results[0].value : [];
    const stats = results[1].status === "fulfilled" ? results[1].value : null;
    const sorted = [...rows].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    setRecentCases(
      sorted.slice(0, 3).map((c) => ({
        id: c.case_id,
        title: c.title,
        type: (c as any).domain_subtype
          ? translateUi(`${(c as any).domain_primary || c.domain || t("common.general")} / ${(c as any).domain_subtype}`)
          : translateUi((c as any).domain_primary || c.domain || t("common.general")),
        status:
          String((c as any).status || "").toLowerCase() === "archived"
            ? t("common.archived")
            : c.last_run_status === "FAILED"
              ? t("common.review")
              : t("common.active"),
        risk: t("common.mediumRisk"),
        isActive: c.case_id === activeCaseId,
        hasAutomatedReport: Number((c as any).successful_run_count || 0) > 0,
      })),
    );
    setDashboardStats(stats || null);
    setMode("ready");
  }, [activeCaseId, t, translateUi]);

  useEffect(() => {
    setHeroQuery("");
  }, [activeCaseId]);

  useEffect(() => {
    if (!activeCaseId) return;
    void caseService.fetchCase(activeCaseId).catch(() => undefined);
  }, [activeCaseId]);

  useEffect(() => {
    return () => {
      if (heroPointerFrameRef.current != null) {
        window.cancelAnimationFrame(heroPointerFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedWorkspaceFiles([]);
  }, [activeCaseId]);

  useEffect(() => {
    setSelectedWorkspaceFiles((prev) => prev.filter((name) => workspaceUploadedFiles.includes(name)));
  }, [workspaceUploadedFiles]);

  useEffect(() => {
    let mounted = true;
    setDashboardLoading(true);

    refreshDashboardData()
      .then(() => {
        if (!mounted) return;
      })
      .catch(() => {
        if (!mounted) return;
        setMode("error");
      })
      .finally(() => {
        if (!mounted) return;
        setDashboardLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [casesById, refreshDashboardData]);

  const openRecentCase = async (item: { id: string; title: string; hasAutomatedReport?: boolean }) => {
    setCaseWorkspace(item.id, item.title);
    void authService.setActiveCase(item.id).catch(() => undefined);

    if (item.hasAutomatedReport) {
      setLocation(`/app/dashboard/analysis/result?caseId=${encodeURIComponent(item.id)}`);
      return;
    }

    try {
      const details = await caseService.fetchCase(item.id);
      const outputs = (details as any)?.outputs || {};
      const hasAnySavedOutput = Object.keys(outputs).some((k) => {
        const value = outputs[k];
        return value && typeof value === "object" && Object.keys(value).length > 0;
      });
      if (hasAnySavedOutput) {
        setLocation(`/app/dashboard/analysis/result?caseId=${encodeURIComponent(item.id)}`);
        return;
      }
    } catch {
      // fallback to workspace route
    }

    setLocation(`/app/cases/${item.id}`);
  };

  const handleQuickQuerySubmit = async (queryText: string) => {
    if (!selectedWorkspaceFiles.length && isUnfilledSuggestedPrompt(queryText)) {
      toast({
        title: translateUi("Update the prompt"),
        description: translateUi(
          "This looks like an old fill-in template. Use one of the updated predefined prompts or replace it with a factual case description.",
        ),
        variant: "destructive",
      });
      return;
    }
    setQuickQuerySubmitting(true);
    try {
      const caseId = activeCaseId || await caseService.ensureCase("Quick Query Workspace");
      const draftKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const attachedDocs = selectedWorkspaceFiles.slice();

      sessionStorage.setItem(
        `${DASHBOARD_RUN_DRAFT_PREFIX}${draftKey}`,
        JSON.stringify({ query: queryText, attachedDocs }),
      );
      setLoadingIntent({
        type: "run_all",
        caseId,
        draftKey,
        createdAt: Date.now(),
      });

      const loadingHref = `/app/cases/${encodeURIComponent(caseId)}/run?caseId=${encodeURIComponent(caseId)}&draftKey=${encodeURIComponent(draftKey)}`;
      setLocation(loadingHref);
    } finally {
      setQuickQuerySubmitting(false);
    }
  };

  const handleUploadShortcut = async () => {
    const caseId = await caseService.ensureCase("Uploaded Case Workspace");
    const title = casesById[caseId]?.title || "Uploaded Case Workspace";
    setCaseWorkspace(caseId, title);
    void authService.setActiveCase(caseId).catch(() => undefined);
    uploadInputRef.current?.click();
  };

  const handleDashboardUpload = async (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;

    try {
      setUploadingFiles(files.map((f) => f.name));
      const caseId = await caseService.ensureCase("Uploaded Case Workspace");
      const title = casesById[caseId]?.title || "Uploaded Case Workspace";
      setCaseWorkspace(caseId, title);
      await caseService.uploadFiles(caseId, files, { addToWorkspace: false });
      await caseService.fetchCase(caseId);
      await refreshDashboardData();
      setSelectedWorkspaceFiles((prev) => {
        const next = [...prev];
        for (const name of files.map((f) => f.name)) {
          if (!next.some((n) => n.toLowerCase() === name.toLowerCase())) next.push(name);
        }
        return next;
      });
      toast({
        title: translateUi("Documents uploaded"),
        description: `${files.length} file${files.length > 1 ? "s are" : " is"} ready for this dashboard run.`,
      });
    } catch (error) {
      toast({
        title: translateUi("Upload failed"),
        description: error instanceof Error ? translateUi(error.message) : translateUi("Could not upload documents from dashboard."),
        variant: "destructive",
      });
    } finally {
      setUploadingFiles([]);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const liveKpis = dashboardStats
    ? [
        {
          label: t("dashboard.activeContracts"),
          value: String(Math.max(0, dashboardStats.active_contracts || 0)),
          trend: t("dashboard.thisWeek", { value: `${dashboardStats.active_contracts_delta_week >= 0 ? "+" : ""}${dashboardStats.active_contracts_delta_week || 0}` }),
          icon: FileText,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: t("dashboard.highRiskCases"),
          value: String(Math.max(0, dashboardStats.high_risk_cases || 0)),
          trend: t("dashboard.fromLastWeek", { value: `${dashboardStats.high_risk_delta_week >= 0 ? "+" : ""}${dashboardStats.high_risk_delta_week || 0}` }),
          icon: AlertTriangle,
          color: "text-destructive",
          bg: "bg-destructive/10",
        },
        {
          label: t("dashboard.complianceScore"),
          value: `${Math.max(0, Math.min(100, dashboardStats.compliance_score || 0))}%`,
          trend: t("dashboard.thisMonth", { value: `${dashboardStats.compliance_delta_month >= 0 ? "+" : ""}${dashboardStats.compliance_delta_month || 0}` }),
          icon: CheckCircle2,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          label: t("dashboard.resolutionRate"),
          value: `${Math.max(0, Math.min(100, dashboardStats.resolution_rate || 0))}%`,
          trend: t("dashboard.thisMonth", { value: `${dashboardStats.resolution_delta_month >= 0 ? "+" : ""}${dashboardStats.resolution_delta_month || 0}` }),
          icon: TrendingUp,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
      ]
    : [
        {
          label: t("dashboard.activeContracts"),
          value: "0",
          trend: "",
          icon: FileText,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: t("dashboard.highRiskCases"),
          value: "0",
          trend: "",
          icon: AlertTriangle,
          color: "text-destructive",
          bg: "bg-destructive/10",
        },
        {
          label: t("dashboard.complianceScore"),
          value: "0%",
          trend: "",
          icon: CheckCircle2,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          label: t("dashboard.resolutionRate"),
          value: "0%",
          trend: "",
          icon: TrendingUp,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
      ];

  const workspaceSummary = {
    activeCaseTitle: translateUi(activeCase?.title || recentCases[0]?.title || t("dashboard.noActiveWorkspaceSelected")),
    activeCaseType: translateUi(activeCase?.domain || recentCases[0]?.type || t("dashboard.sharedLegalWorkspace")),
    uploadedCount: workspaceUploadedFiles.length,
    selectedCount: selectedWorkspaceFiles.length,
    recentCount: recentCases.length,
  };
  return (
    <div className="w-full">
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={(event) => void handleDashboardUpload(event.target.files)}
      />

      {mode === "loading" ? (
        <LoadingState title="Loading dashboard" description="Preparing your legal workspace." />
      ) : null}
      {mode === "error" ? (
        <ErrorState title={t("dashboard.unavailable")} description={t("dashboard.unavailableDescription")} />
      ) : null}

      {mode === "error" ? null : (
        <>
          <FadeIn>
            <section
              ref={heroSurfaceRef}
              className="relative mb-12 overflow-hidden px-0 py-4 md:py-6"
              onMouseMove={(event) => {
                const node = heroSurfaceRef.current;
                if (!node) return;
                const bounds = node.getBoundingClientRect();
                const nextX = `${(((event.clientX - bounds.left) / bounds.width) * 100).toFixed(2)}%`;
                const nextY = `${(((event.clientY - bounds.top) / bounds.height) * 100).toFixed(2)}%`;
                if (heroPointerFrameRef.current != null) window.cancelAnimationFrame(heroPointerFrameRef.current);
                heroPointerFrameRef.current = window.requestAnimationFrame(() => {
                  node.style.setProperty("--dashboard-px", nextX);
                  node.style.setProperty("--dashboard-py", nextY);
                });
              }}
              onMouseLeave={() => {
                const node = heroSurfaceRef.current;
                if (!node) return;
                node.style.setProperty("--dashboard-px", "50%");
                node.style.setProperty("--dashboard-py", "28%");
              }}
            >
              <div className="pointer-events-none absolute inset-0 scale-[1.05] bg-[linear-gradient(135deg,rgba(255,248,240,0.42),rgba(239,246,255,0.34)_40%,rgba(250,235,245,0.34)),radial-gradient(36rem_24rem_at_16%_18%,rgba(251,191,36,0.18),transparent_58%),radial-gradient(34rem_22rem_at_84%_24%,rgba(96,165,250,0.18),transparent_60%),radial-gradient(36rem_24rem_at_50%_100%,rgba(244,114,182,0.14),transparent_68%),radial-gradient(26rem_16rem_at_50%_42%,rgba(192,132,252,0.12),transparent_56%)] dark:bg-[linear-gradient(180deg,rgba(2,2,3,0.44),rgba(7,6,10,0.56)),radial-gradient(34rem_26rem_at_50%_20%,rgba(109,40,217,0.24),transparent_62%),radial-gradient(42rem_30rem_at_50%_100%,rgba(124,58,237,0.16),transparent_72%)]" />
              <div className="pointer-events-none absolute inset-0 scale-[1.05] bg-[linear-gradient(to_right,rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:54px_54px] opacity-20 [mask-image:radial-gradient(84%_70%_at_50%_36%,black_24%,transparent_100%)] dark:opacity-10" />
              <div aria-hidden="true" className="dashboard-pointer-glow pointer-events-none absolute inset-0 opacity-90 dark:hidden" />
              <div aria-hidden="true" className="dashboard-pointer-glow-dark pointer-events-none absolute inset-0 hidden opacity-90 dark:block" />
              <div aria-hidden="true" className="dashboard-pointer-halo pointer-events-none absolute inset-0 opacity-60 mix-blend-screen dark:opacity-30" />
              <div aria-hidden="true" className="hero-loop-band pointer-events-none absolute inset-x-[-4%] top-[10%] h-[18rem] dark:hidden" />
              <div aria-hidden="true" className="hero-loop-orb-a pointer-events-none absolute left-[-4rem] top-[10%] h-[19rem] w-[19rem] dark:hidden" />
              <div aria-hidden="true" className="hero-loop-orb-b pointer-events-none absolute right-[-3rem] top-[14%] h-[21rem] w-[21rem] dark:hidden" />
              <div aria-hidden="true" className="hero-loop-orb-c pointer-events-none absolute bottom-[-5rem] left-[26%] h-[18rem] w-[18rem] dark:hidden" />
              <div aria-hidden="true" className="hero-loop-dark-a pointer-events-none absolute left-[-5rem] top-[8%] hidden h-[20rem] w-[20rem] dark:block" />
              <div aria-hidden="true" className="hero-loop-dark-b pointer-events-none absolute right-[-4rem] top-[18%] hidden h-[22rem] w-[22rem] dark:block" />
              <div aria-hidden="true" className="hero-loop-dark-c pointer-events-none absolute inset-x-[12%] top-[20%] hidden h-[16rem] dark:block" />

              <div className="relative flex min-h-[calc(100vh-10rem)] flex-col justify-center px-3 py-4 md:px-4 md:py-5">
                <div className="mx-auto mb-6 w-full max-w-[96rem] text-center md:mb-8">
                  <h1 className="mx-auto max-w-[13ch] text-balance text-[clamp(2.35rem,5.2vw,5rem)] font-semibold leading-[0.94] tracking-[-0.075em] text-slate-950 drop-shadow-[0_10px_30px_rgba(255,255,255,0.08)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,255,255,0.82))] dark:bg-clip-text dark:text-transparent">
                    {t("dashboard.welcome", { name: user?.name || t("dashboard.defaultUser") })}
                  </h1>
                </div>

                <div className="mx-auto w-full max-w-[96rem]">
                  <div className="mx-auto mb-3 max-w-[96rem] text-center">
                    <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground dark:text-white/52">
                      {t("dashboard.suggestedPrompts")}
                    </div>
                  </div>

                  <div className="mx-auto mb-4 flex max-w-[66rem] flex-wrap justify-center gap-2 md:mb-5">
                    {SUGGESTED_CASE_PROMPTS.map((item, index) => (
                      <motion.button
                        key={item.label}
                        type="button"
                        onClick={() => setHeroQuery(item.prompt)}
                        initial={{ opacity: 0, y: 6, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.12 + index * 0.05, duration: 0.42, ease: "easeOut" }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className="dashboard-suggestion-chip group relative min-w-[9.75rem] max-w-[12.25rem] overflow-hidden rounded-[1.1rem] px-3.5 py-2 text-left transition duration-200"
                      >
                        <div className="dashboard-suggestion-chip__beam pointer-events-none absolute inset-0" />
                        <div
                          className="dashboard-suggestion-chip__glow pointer-events-none absolute inset-0"
                          style={{ animationDelay: `${index * 1.1}s` }}
                        />
                        <div className="relative flex min-w-0 items-center">
                          <div className="min-w-0">
                            <div className="truncate text-[0.76rem] font-medium tracking-[-0.015em] text-slate-900 dark:text-white/88">
                              {item.label}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <PromptCanvasComposer
                    showHeader={false}
                    value={heroQuery}
                    onValueChange={setHeroQuery}
                    onSubmit={handleQuickQuerySubmit}
                    onUploadClick={() => void handleUploadShortcut()}
                    hints={roleConfig.quickQueryHints}
                    uploadedFiles={selectedWorkspaceFiles}
                    uploadingFiles={uploadingFiles}
                    requireSelectedFilesForSubmit={false}
                    availableWorkspaceFiles={workspaceUploadedFiles}
                    onToggleWorkspaceFile={(file) =>
                      setSelectedWorkspaceFiles((prev) =>
                        prev.includes(file) ? prev.filter((name) => name !== file) : [...prev, file],
                      )
                    }
                    onRemoveUploadedFile={(file) =>
                      setSelectedWorkspaceFiles((prev) => prev.filter((name) => name !== file))
                    }
                    onFocusChange={() => undefined}
                    workspaceFileCount={workspaceUploadedFiles.length}
                    viewAllHref={activeCaseId ? `/app/documents/my?caseId=${encodeURIComponent(activeCaseId)}` : "/app/documents/my"}
                    submitting={quickQuerySubmitting}
                    showWorkspaceFooter={false}
                    className="mx-auto max-w-[62rem]"
                  />

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground md:mt-6">
                    <span>{t("dashboard.uploadOnce")}</span>
                    {workspaceUploadedFiles.length > 0 ? (
                      <>
                        <span>{t("dashboard.attached", { count: selectedWorkspaceFiles.length || 0 })}</span>
                        <Link href={activeCaseId ? `/app/documents/my?caseId=${encodeURIComponent(activeCaseId)}` : "/app/documents/my"}>
                          <span className="cursor-pointer text-primary hover:underline">{t("dashboard.manageDocuments")}</span>
                        </Link>
                      </>
                    ) : (
                      <span>{t("dashboard.noFiles")}</span>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-center md:mt-10">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {t("dashboard.scroll")}
                  </span>
                </div>
              </div>
            </section>
          </FadeIn>

          <section className="grid gap-6 px-4 md:px-6 xl:grid-cols-12 xl:px-8">
            <div className="xl:col-span-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="app-heading text-2xl">{t("dashboard.recentCases")}</h2>
                <Link href="/app/cases">
                  <Button variant="ghost" size="sm">{t("common.viewAll")}</Button>
                </Link>
              </div>

              <div className="space-y-3">
                {dashboardLoading
                  ? new Array(2).fill(null).map((_, i) => (
                      <FadeIn key={`skeleton-${i}`} delay={0.2 + i * 0.08}>
                        <Card className="surface-panel animate-pulse p-5">
                          <div className="flex items-start justify-between">
                            <div className="w-full space-y-2">
                              <div className="h-3 w-36 rounded bg-muted" />
                              <div className="h-5 w-3/4 rounded bg-muted" />
                            </div>
                            <div className="h-6 w-20 rounded-md bg-muted" />
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t pt-3">
                            <div className="h-4 w-24 rounded bg-muted" />
                            <div className="h-4 w-28 rounded bg-muted" />
                          </div>
                        </Card>
                      </FadeIn>
                    ))
                  : recentCases.slice(0, 2).map((c, i) => (
                      <FadeIn key={i} delay={0.2 + i * 0.08}>
                        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                          <ClickableCard
                            ariaLabel={translateUi(`Open workspace ${c.id}`)}
                            className="app-premium-card group overflow-hidden rounded-[1.75rem] p-6"
                            onClick={() => void openRecentCase(c)}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_0%,rgba(59,130,246,0.07),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent)] opacity-80 transition-opacity duration-300 group-hover:opacity-100 dark:bg-[radial-gradient(90%_120%_at_0%_0%,rgba(34,211,238,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground dark:text-slate-400">{c.id}</span>
                                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{c.type}</span>
                                  {c.isActive ? (
                                    <span className="rounded-full border border-black/8 px-3 py-1 text-xs text-foreground dark:border-white/12 dark:text-white">
                                      {t("common.active")}
                                    </span>
                                  ) : null}
                                </div>
                                <h3 className="max-w-[30ch] text-2xl font-semibold leading-tight text-foreground transition-colors group-hover:text-primary dark:text-white dark:group-hover:text-sky-300">
                                  {translateUi(c.title)}
                                </h3>
                              </div>
                              <div className="flex flex-row items-start gap-2 xl:flex-col xl:items-end">
                                <span className="rounded-xl bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-500">
                                  {c.risk}
                                </span>
                              </div>
                            </div>
                            <div className="mt-5 flex items-center justify-between border-t border-black/8 pt-5 text-sm text-muted-foreground dark:border-white/10 dark:text-slate-400">
                              <span>{t("dashboard.status", { status: c.status })}</span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void openRecentCase(c);
                                }}
                                aria-label={translateUi(`Open workspace for ${c.id}`)}
                                className="flex items-center gap-1 rounded-sm transition-colors group-hover:text-primary dark:group-hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                {c.hasAutomatedReport ? t("dashboard.openReport") : t("dashboard.openWorkspace")} <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </ClickableCard>
                        </motion.div>
                      </FadeIn>
                    ))}
                {!dashboardLoading && recentCases.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">
                    {t("dashboard.noCases")}
                  </Card>
                ) : null}
              </div>
            </div>

            <div className="xl:col-span-4">
              <Card className="app-premium-card relative h-full overflow-hidden rounded-[1.8rem] p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_110%_at_100%_0%,rgba(34,211,238,0.06),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] dark:bg-[radial-gradient(110%_110%_at_100%_0%,rgba(34,211,238,0.08),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
                <div className="relative">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{t("dashboard.workspaceStatus")}</div>
                  <div className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.05em] text-foreground dark:text-white">
                    {workspaceSummary.activeCaseTitle}
                  </div>
                  <div className="mt-2 text-base text-muted-foreground">{workspaceSummary.activeCaseType}</div>
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-foreground dark:text-white">
                        {workspaceSummary.uploadedCount}
                      </div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("common.files")}</div>
                    </div>
                    <div>
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-foreground dark:text-white">
                        {workspaceSummary.selectedCount}
                      </div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("common.selected")}</div>
                    </div>
                    <div>
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-foreground dark:text-white">
                        {workspaceSummary.recentCount}
                      </div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("common.recent")}</div>
                    </div>
                  </div>
                  <div className="mt-8 grid gap-3">
                    <Button className="h-12 rounded-full" onClick={() => void handleUploadShortcut()}>
                      {t("dashboard.uploadToWorkspace")}
                    </Button>
                    <Button variant="outline" className="h-12 rounded-full" onClick={() => setLocation("/app/cases")}>
                      {t("dashboard.openCaseHistory")}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="xl:col-span-12">
              <Card className="app-premium-card relative overflow-hidden rounded-[1.8rem] p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_120%_at_0%_0%,rgba(59,130,246,0.06),transparent_34%),radial-gradient(100%_100%_at_100%_100%,rgba(14,165,233,0.06),transparent_34%)] dark:bg-[radial-gradient(110%_120%_at_0%_0%,rgba(59,130,246,0.08),transparent_34%),radial-gradient(100%_100%_at_100%_100%,rgba(34,211,238,0.06),transparent_34%)]" />
                <div className="relative">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{t("dashboard.recommendedAgents")}</div>
                  <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-[-0.04em] text-foreground dark:text-white">
                        {t("dashboard.routesFit")}
                      </h3>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {roleConfig.recommended.slice(0, 4).map((agent, i) => (
                      (() => {
                        const art = AGENT_CARD_ART[agent.title] ?? {
                          light:
                            "bg-[radial-gradient(18rem_12rem_at_18%_24%,rgba(251,191,36,0.18),transparent_56%),radial-gradient(18rem_12rem_at_84%_22%,rgba(59,130,246,0.16),transparent_56%),linear-gradient(135deg,rgba(248,250,252,0.96),rgba(241,245,249,0.9))]",
                          dark:
                            "dark:bg-[radial-gradient(18rem_12rem_at_18%_24%,rgba(168,85,247,0.14),transparent_56%),radial-gradient(18rem_12rem_at_84%_22%,rgba(59,130,246,0.12),transparent_56%),linear-gradient(135deg,rgba(10,10,12,0.94),rgba(17,17,22,0.92))]",
                        };

                        return (
                          <ClickableCard
                            key={i}
                            ariaLabel={`Open ${agent.title}`}
                            className={cn(
                              "group relative flex min-h-[160px] items-center justify-between overflow-hidden rounded-[1.55rem] border border-black/6 p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.24)] transition duration-200 hover:-translate-y-[2px] hover:border-primary/15 hover:shadow-[0_24px_48px_-30px_rgba(15,23,42,0.26)] dark:border-white/8 dark:hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.62)]",
                              art.light,
                              art.dark,
                            )}
                            onClick={() => setLocation(agent.href)}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.12),transparent_34%,rgba(255,255,255,0.05)_72%,rgba(255,255,255,0.14))] opacity-80 transition-opacity duration-200 group-hover:opacity-100 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.02),transparent_34%,rgba(255,255,255,0.015)_72%,rgba(255,255,255,0.05))]" />
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(12rem_10rem_at_88%_24%,rgba(255,255,255,0.28),transparent_60%)] opacity-70 transition duration-200 group-hover:scale-[1.03] dark:opacity-40" />
                            <div className="pointer-events-none absolute inset-y-0 right-[5.25rem] w-px bg-black/6 dark:bg-white/8" />
                            <div className="relative z-10 pr-4">
                              <h4 className="text-base font-bold text-foreground dark:text-white">{translateUi(agent.title)}</h4>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground dark:text-slate-300">{translateUi(agent.desc)}</p>
                            </div>
                            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-white/40 text-slate-700 backdrop-blur-sm transition-colors group-hover:text-primary dark:border-white/10 dark:bg-white/[0.06] dark:text-white/72 dark:group-hover:text-sky-300">
                              <ArrowRight className="h-4 w-4" />
                            </span>
                          </ClickableCard>
                        );
                      })()
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

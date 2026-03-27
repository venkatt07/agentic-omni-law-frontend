import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useRef } from "react";
import { Download, ExternalLink, FileCheck, Play, RefreshCw, Scale } from "lucide-react";
import { authService } from "@/services/authService";
import { caseService } from "@/services/caseService";
import { policyComplianceService, type PolicyComplianceMeta, type PolicyComplianceOutput } from "@/services/policyComplianceService";
import { apiClient } from "@/services/apiClient";
import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import AgentReportBackButton from "@/components/app/AgentReportBackButton";
import { useI18n } from "@/hooks/useI18n";
import { canOpenSourceDocument, getSourceActionLabel, getSourceDisplayName, getSourceLeadLabel, hasPageCount, isPastedSource } from "@/lib/sourceDocument";
import { openAgentCase } from "@/lib/agentCaseNavigation";

type UiState = "loading" | "idle" | "running" | "done" | "error";
type CaseListItem = { case_id: string; title: string; domain: string; updated_at: string; last_run_status: string | null };

function hasRenderablePolicyOutput(output: PolicyComplianceOutput | null) {
  if (!output || typeof output !== "object") return false;
  if (typeof output.overall_score === "number") return true;
  if (Array.isArray(output.citations) && output.citations.length > 0) return true;
  if (Array.isArray(output.violations) && output.violations.length > 0) return true;
  const reasoning = String(output?.decision_support?.reasoning || "").trim();
  return reasoning.length > 0;
}

export default function PolicyCompliance() {
  const [matchCaseRoute, params] = useRoute("/app/cases/:caseId/agents/policy-compliance/results");
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const caseId = matchCaseRoute ? params.caseId : undefined;
  const [, setLocation] = useLocation();

  const [state, setState] = useState<UiState>("loading");
  const [meta, setMeta] = useState<PolicyComplianceMeta | null>(null);
  const [output, setOutput] = useState<PolicyComplianceOutput | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [framework, setFramework] = useState<string>("Indian Contract & Commercial");
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [resolvingDefaultCase, setResolvingDefaultCase] = useState(false);
  const [metaLoadAttempt, setMetaLoadAttempt] = useState(0);
  const [isHydratingSavedReport, setIsHydratingSavedReport] = useState(true);
  const defaultCaseRedirectRef = useRef<string | null>(null);
  const emptyConfirmTimerRef = useRef<number | null>(null);
  const { t } = useI18n();
  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timer: number | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
        }),
      ]);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  };

  useEffect(() => {
    if (!casePickerOpen) return;
    setLoadingCases(true);
    caseService
      .listCases()
      .then((rows) => setCases(rows as any))
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false));
  }, [casePickerOpen]);

  useEffect(() => {
    if (matchCaseRoute) {
      defaultCaseRedirectRef.current = null;
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      let targetCaseId = "";
      let targetTitle = t("common.currentCaseWorkspace");
      try {
        const rows = await caseService.listCases();
        if (rows?.length) {
          targetCaseId = rows[0].case_id;
          targetTitle = rows[0].title || targetTitle;
        }
      } catch {}
      if (!targetCaseId && activeCaseId) {
        targetCaseId = activeCaseId;
        targetTitle = useAppStore.getState().casesById[targetCaseId]?.title || targetTitle;
      }
      if (!targetCaseId) {
        try {
          const me = await authService.me();
          targetCaseId = (me as any)?.active_case_id || "";
        } catch {}
      }
      if (!targetCaseId || cancelled) return;
      if (defaultCaseRedirectRef.current === targetCaseId) return;
      defaultCaseRedirectRef.current = targetCaseId;
      setResolvingDefaultCase(true);
      try {
        setActiveCaseId(targetCaseId);
        await openAgentCase({
          agentKey: "policy_compliance",
          caseId: targetCaseId,
          title: targetTitle,
          setLocation,
          replace: true,
        });
      } finally {
        if (!cancelled) setResolvingDefaultCase(false);
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [activeCaseId, matchCaseRoute, setActiveCaseId, setLocation, t]);

  async function loadMeta() {
    if (!caseId) return;
    setError(null);
    setState((s) => (s === "running" ? s : "loading"));
    try {
      const data = await withTimeout(policyComplianceService.getMeta(caseId), 25000, "Policy Compliance meta");
      setMeta(data);
      setMetaLoadAttempt(0);
      setFramework(data.frameworks?.[0] || "Indian Contract & Commercial");
      if (data.latest.status === "done" && data.latest.output) {
        if (emptyConfirmTimerRef.current) {
          window.clearTimeout(emptyConfirmTimerRef.current);
          emptyConfirmTimerRef.current = null;
        }
        setOutput(data.latest.output);
        setState("done");
        setIsHydratingSavedReport(false);
      } else if (data.latest.status === "running" && data.latest.run_id) {
        if (emptyConfirmTimerRef.current) {
          window.clearTimeout(emptyConfirmTimerRef.current);
          emptyConfirmTimerRef.current = null;
        }
        setRunId(data.latest.run_id);
        setState("running");
        setIsHydratingSavedReport(false);
      } else if (data.latest.status === "error" && !data.latest.output) {
        if (emptyConfirmTimerRef.current) {
          window.clearTimeout(emptyConfirmTimerRef.current);
          emptyConfirmTimerRef.current = null;
        }
        setState("error");
        setError(data.latest.failure_reason || t("agent.policy.analysisFailed"));
        setIsHydratingSavedReport(false);
      } else {
        if (data.latest.output) {
          if (emptyConfirmTimerRef.current) {
            window.clearTimeout(emptyConfirmTimerRef.current);
            emptyConfirmTimerRef.current = null;
          }
          setOutput(data.latest.output);
          setState("done");
          setIsHydratingSavedReport(false);
          return;
        }
        setOutput(null);
        if (!emptyConfirmTimerRef.current) {
          setIsHydratingSavedReport(true);
          emptyConfirmTimerRef.current = window.setTimeout(() => {
            emptyConfirmTimerRef.current = null;
            void loadMeta();
          }, 900);
        } else {
          setState("idle");
          setIsHydratingSavedReport(false);
        }
      }
      if (data.case?.title) useAppStore.getState().setCaseWorkspace(caseId, data.case.title);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("agent.policy.failedLoad");
      const timedOut = /timed out/i.test(message);
      if (timedOut && metaLoadAttempt < 1) {
        setMetaLoadAttempt((x) => x + 1);
        await new Promise((r) => setTimeout(r, 600));
        return loadMeta();
      }
      setState("error");
      setError(timedOut ? t("agent.policy.loadTimeout") : message);
      setIsHydratingSavedReport(false);
    }
  }

  useEffect(() => {
    if (!caseId) return;
    setIsHydratingSavedReport(true);
    if (emptyConfirmTimerRef.current) {
      window.clearTimeout(emptyConfirmTimerRef.current);
      emptyConfirmTimerRef.current = null;
    }
    void loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    return () => {
      if (emptyConfirmTimerRef.current) window.clearTimeout(emptyConfirmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!caseId || !runId) return;
    let cancelled = false;
    let timer: number | null = null;
    const poll = async () => {
      try {
        const status = await policyComplianceService.getRunStatus(runId);
        if (cancelled) return;
        setRunStatus(status);
        if (status.status === "SUCCEEDED") {
          try {
            const out = await policyComplianceService.getOutput(caseId);
            if (cancelled) return;
            setOutput(out);
          } catch {
            const latestMeta = await policyComplianceService.getMeta(caseId).catch(() => null);
            if (cancelled) return;
            const fallbackOutput = latestMeta?.latest?.output || null;
            if (fallbackOutput) {
              setMeta(latestMeta);
              setOutput(fallbackOutput);
            } else {
              throw new Error(t("agent.policy.analysisFailed"));
            }
          }
          setState("done");
          setRunId(null);
          void loadMeta();
          return;
        }
        if (status.status === "FAILED") {
          try {
            const latestMeta = await policyComplianceService.getMeta(caseId).catch(() => null);
            if (cancelled) return;
            const fallbackOutput = latestMeta?.latest?.output || null;
            if (fallbackOutput) {
              setMeta(latestMeta);
              setOutput(fallbackOutput);
              setState("done");
              setRunId(null);
              return;
            }
          } catch {
            // Fall through to error state below.
          }
          setState("error");
          setError(status.error || status.error_message || t("agent.policy.analysisFailed"));
          setRunId(null);
          return;
        }
        timer = window.setTimeout(poll, 900);
      } catch (e) {
        if (cancelled) return;
        setState("error");
        setError(e instanceof Error ? e.message : t("agent.policy.analysisFailed"));
        setRunId(null);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [caseId, runId]);

  async function startRun(force = false) {
    if (!caseId) return;
    setError(null);
    setState("running");
    try {
      const res = await policyComplianceService.startRun(caseId, { force, framework });
      if (res.status === "cached" && res.output) {
        setOutput(res.output);
        setState("done");
        void loadMeta();
        return;
      }
      if (!res.run_id) throw new Error("No run id returned");
      setRunId(res.run_id);
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : t("agent.policy.analysisFailed"));
    }
  }

  const progressPct = useMemo(() => {
    const steps = runStatus?.steps || [];
    if (!steps.length) return 10;
    return Math.max(...steps.map((s: any) => Number(s.progress || 0)));
  }, [runStatus]);

  if (!caseId) {
    if (resolvingDefaultCase) {
      return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          <LoadingState title={t("agent.policy.opening")} description={t("common.loadingSelectedCase")} />
        </div>
      );
    }
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <EmptyState
          title={t("common.noCaseSelected")}
          description={t("agent.outcome.noActiveCaseDescription")}
          actionLabel={t("common.openQueryParsing")}
          onAction={() => setLocation("/app/agents/query")}
        />
      </div>
    );
  }

  const selectedCaseTitle = meta?.case?.title || useAppStore.getState().casesById[caseId]?.title || t("common.selectedCase");
  const isPastedInput = isPastedSource(meta?.primary_doc);
  const sourceTitle = isHydratingSavedReport && !meta
    ? "Loading case workspace"
    : getSourceDisplayName(meta?.primary_doc, t("agent.policy.noCaseDocument"));
  const sourceLeadLabel = isHydratingSavedReport && !meta
    ? "Preparing saved compliance report"
    : getSourceLeadLabel(meta?.primary_doc);
  const sourceActionLabel = getSourceActionLabel(meta?.primary_doc);
  const canOpenSource = canOpenSourceDocument(meta?.primary_doc);
  const workspaceSummary = meta?.workspace_summary || null;
  const totalWorkspacePages = typeof workspaceSummary?.total_pages === "number" ? workspaceSummary.total_pages : null;
  const totalPagesBadge = totalWorkspacePages ?? (hasPageCount(meta?.primary_doc) ? Number(meta?.primary_doc?.pages || 0) : null);
  const hasRenderableOutput = hasRenderablePolicyOutput(output);
  const canExport = hasRenderableOutput && state === "done";
  const categoryScores = Array.isArray(output?.category_scores) ? output.category_scores : [];
  const violations = Array.isArray(output?.violations) ? output.violations : [];
  const remediationPlan = Array.isArray(output?.remediation_plan) ? output.remediation_plan : [];
  const citations = Array.isArray(output?.citations) ? output.citations : [];
  const decisionSupport = (output?.decision_support || {}) as { best_path?: string; reasoning?: string };
  const counts = output?.counts || { critical: 0, medium: 0 };
  const hasExistingResult = hasRenderableOutput || meta?.latest?.status === "done";
  const primaryRunLabel = hasExistingResult ? "Run Fresh Check" : t("agent.policy.runCheck");
  const primaryRunForce = hasExistingResult;
  const showPrimaryRunAction = !hasRenderableOutput;
  const exportUrl = policyComplianceService.getExportUrl(caseId);
  const downloadExportPdf = async () => {
    if (!canExport) return;
    try {
      await apiClient.download(exportUrl, { filename: `policy-compliance-${caseId}.pdf` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      window.alert(message);
    }
  };

  return (
    <div className="p-6 pt-10 md:p-8 md:pt-14 max-w-7xl mx-auto space-y-6">
      <Dialog open={casePickerOpen} onOpenChange={setCasePickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("common.switchCase")}</DialogTitle>
            <DialogDescription>{t("agent.policy.casePickerResultsDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {loadingCases ? <div className="text-sm text-muted-foreground">{t("common.loadingCaseHistory")}</div> : null}
            {!loadingCases && !cases.length ? <div className="text-sm text-muted-foreground">{t("common.noCasesFound")}</div> : null}
            {cases.map((row) => (
              <button
                key={row.case_id}
                type="button"
                onClick={() => {
                  setCasePickerOpen(false);
                  void openAgentCase({
                    agentKey: "policy_compliance",
                    caseId: row.case_id,
                    title: row.title,
                    setLocation,
                  });
                }}
                className="w-full text-left rounded-md border p-3 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.domain}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleString()}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <AgentReportBackButton fallbackHref={`/app/cases/${caseId}/agents/query-parsing`} fallbackLabel={t("common.backToQueryParsing")} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
          <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">{t("agent.policy.agentAnalysis")}</div>
          <h1 className="text-3xl font-bold font-heading">{t("agent.policy.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("agent.policy.subtitleResults")}</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Badge variant="outline">Case: {selectedCaseTitle}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setCasePickerOpen(true)}>
              {t("common.switchCase")}
            </Button>
          </div>
        </div>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">{sourceLeadLabel}</p>
            <h2 className="font-semibold text-lg">{sourceTitle}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {meta?.primary_doc?.mime_type ? <Badge variant="outline">{meta.primary_doc.mime_type}</Badge> : null}
              {isPastedInput ? <Badge variant="outline">Text Query</Badge> : null}
              {totalPagesBadge != null && totalPagesBadge > 0 ? <Badge variant="outline">{totalPagesBadge} total {t("common.pages")}</Badge> : null}
              {meta?.primary_doc?.updated_at ? <Badge variant="outline">{t("common.updated")} {new Date(meta.primary_doc.updated_at).toLocaleString()}</Badge> : null}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={t("common.selectFramework")} />
              </SelectTrigger>
              <SelectContent>
                {(meta?.frameworks || []).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canOpenSource ? (
              <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/documents/${meta?.primary_doc?.doc_id}`)}>
                {sourceActionLabel}
              </Button>
            ) : null}
            {showPrimaryRunAction ? (
              <Button onClick={() => void startRun(primaryRunForce)} disabled={state === "running" || !meta?.primary_doc}>
                <Play className="h-4 w-4 mr-2" />
                {primaryRunLabel}
              </Button>
            ) : null}
            <Button variant="outline" disabled={!canExport} onClick={() => void downloadExportPdf()}>
              <Download className="h-4 w-4 mr-2" />
              {t("common.exportPdf")}
            </Button>
          </div>
        </div>
      </Card>

      {state === "running" ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <div>
              <div className="font-semibold">Running compliance checks...</div>
              <div className="text-sm text-muted-foreground">{runStatus?.stage || runStatus?.progress?.step || t("agent.policy.preparingRun")}</div>
            </div>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="space-y-2">
            {(runStatus?.steps || []).map((s: any, idx: number) => (
              <div key={`${s.name}-${idx}`} className="flex items-center justify-between text-sm">
                <span className={s.state === "RUNNING" ? "text-primary" : "text-muted-foreground"}>{s.name}</span>
                <Badge variant={s.state === "SUCCEEDED" ? "default" : s.state === "RUNNING" ? "secondary" : "outline"}>{s.state}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {state === "error" ? (
        <ErrorState title={t("agent.policy.analysisFailed")} description={error || t("common.retry")} actionLabel={t("common.retry")} onAction={() => void startRun(true)} />
      ) : null}

      {isHydratingSavedReport && state !== "running" && state !== "error" && !output ? (
        <LoadingState title="Loading saved compliance report" description="Fetching the latest saved Policy Compliance result for this case." />
      ) : null}

      {state !== "running" && state !== "error" && !output && !isHydratingSavedReport ? (
        <EmptyState title={t("agent.policy.notAnalyzed")} description={t("agent.policy.notAnalyzedDescription")} actionLabel={t("agent.policy.runCheck")} onAction={() => void startRun(false)} />
      ) : null}

      {output ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4 md:col-span-2">
              <div className="text-sm text-muted-foreground">{t("agent.policy.overallScore")}</div>
              <div className="text-3xl font-bold mt-1">{output.overall_score}%</div>
              <div className="mt-2"><Badge>{output.risk_level}</Badge></div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">{t("agent.policy.criticalViolations")}</div>
              <div className="text-2xl font-semibold">{counts.critical}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">{t("agent.policy.mediumIssues")}</div>
              <div className="text-2xl font-semibold">{counts.medium}</div>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="hidden">
            <TabsList>
              <TabsTrigger value="overview">{t("agent.policy.tabOverview")}</TabsTrigger>
              <TabsTrigger value="violations">{t("agent.policy.tabViolations")}</TabsTrigger>
              <TabsTrigger value="heatmap">{t("agent.policy.tabHeatmap")}</TabsTrigger>
              <TabsTrigger value="remediation">{t("agent.policy.tabRemediation")}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-medium mb-3">{t("agent.policy.categoryScores")}</div>
                <div className="space-y-3">
                  {categoryScores.map((c) => (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{c.category}</span>
                        <span>{c.score}%</span>
                      </div>
                      <Progress value={c.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Scale className="h-4 w-4" />
                  {t("agent.policy.decisionSupport")}
                </div>
                <p className="text-sm"><span className="text-muted-foreground">{t("common.bestPath")}:</span> {decisionSupport.best_path || "—"}</p>
                <p className="text-sm mt-1 text-muted-foreground">{decisionSupport.reasoning || "No decision support notes available."}</p>
              </Card>
            </TabsContent>
            <TabsContent value="violations" className="space-y-3">
              {!violations.length ? <Card className="p-4 text-sm text-muted-foreground">{t("agent.policy.noViolations")}</Card> : null}
              {violations.map((v, idx) => (
                <Card key={`${v.title}-${idx}`} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={v.severity === "Critical" ? "destructive" : "secondary"}>{v.severity}</Badge>
                    <div className="font-medium">{v.title}</div>
                  </div>
                  <p className="text-sm">{v.why_it_matters}</p>
                  <p className="text-sm text-muted-foreground">{t("common.fix")}: {v.recommended_fix}</p>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="heatmap">
              <Card className="p-4">
                <div className="text-sm font-medium mb-3">{t("agent.policy.riskHeatmap")}</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {categoryScores.map((c) => (
                    <Card key={c.category} className="p-3 bg-muted/20">
                      <div className="text-sm font-medium">{c.category}</div>
                      <div className="text-xs text-muted-foreground mt-1">Critical {c.critical} | Medium {c.medium} | Compliant {c.compliant}</div>
                    </Card>
                  ))}
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="remediation" className="space-y-3">
              {remediationPlan.map((r) => (
                <Card key={`${r.step}-${r.action}`} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t("common.step")} {r.step}: {r.action}</div>
                    <Badge variant="outline">{r.priority}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{t("common.owner")}: {r.owner}</div>
                </Card>
              ))}
              {!remediationPlan.length ? <Card className="p-4 text-sm text-muted-foreground">No remediation plan available.</Card> : null}
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-4">
              <div className="text-sm font-medium mb-2">{t("agent.policy.recentRuns")}</div>
              <div className="space-y-2">
                {(meta?.recent_runs || []).map((r) => (
                  <div key={r.run_id} className="rounded-md border p-2 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2"><Badge variant="outline">{r.status}</Badge>{r.risk_level ? <Badge>{r.risk_level}</Badge> : null}</div>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                {t("agent.policy.relevantCitations")}
              </div>
              <div className="space-y-2">
                {citations.map((c) => (
                  <div key={`${c.ref}-${c.doc_id}-${String(c.snippet || "").slice(0, 20)}`} className="rounded-md border p-2 text-xs">
                    <div className="font-medium">{c.ref} · {c.source_type}</div>
                    <div className="text-muted-foreground mt-1">{c.snippet}</div>
                    <div className="text-muted-foreground mt-1">{c.doc_id} {typeof c.page === "number" ? `• p.${c.page}` : ""}</div>
                  </div>
                ))}
                {!citations.length ? <div className="text-sm text-muted-foreground">{t("common.noCitationsReturned")}</div> : null}
              </div>
              <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={() => setLocation(`/app/cases/${caseId}/agents/query-parsing`)}>
                {t("common.openQueryParsing")} <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">{t("agent.policy.tabOverview")}</TabsTrigger>
              <TabsTrigger value="violations">{t("agent.policy.tabViolations")}</TabsTrigger>
              <TabsTrigger value="heatmap">{t("agent.policy.tabHeatmap")}</TabsTrigger>
              <TabsTrigger value="remediation">{t("agent.policy.tabRemediation")}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-medium mb-3">{t("agent.policy.categoryScores")}</div>
                <div className="space-y-3">
                  {categoryScores.map((c) => (
                    <div key={`bottom-${c.category}`}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{c.category}</span>
                        <span>{c.score}%</span>
                      </div>
                      <Progress value={c.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Scale className="h-4 w-4" />
                  {t("agent.policy.decisionSupport")}
                </div>
                <p className="text-sm"><span className="text-muted-foreground">{t("common.bestPath")}:</span> {decisionSupport.best_path || "—"}</p>
                <p className="text-sm mt-1 text-muted-foreground">{decisionSupport.reasoning || "No decision support notes available."}</p>
              </Card>
            </TabsContent>
            <TabsContent value="violations" className="space-y-3">
              {!violations.length ? <Card className="p-4 text-sm text-muted-foreground">{t("agent.policy.noViolations")}</Card> : null}
              {violations.map((v, idx) => (
                <Card key={`bottom-${v.title}-${idx}`} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={v.severity === "Critical" ? "destructive" : "secondary"}>{v.severity}</Badge>
                    <div className="font-medium">{v.title}</div>
                  </div>
                  <p className="text-sm">{v.why_it_matters}</p>
                  <p className="text-sm text-muted-foreground">{t("common.fix")}: {v.recommended_fix}</p>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="heatmap">
              <Card className="p-4">
                <div className="text-sm font-medium mb-3">{t("agent.policy.riskHeatmap")}</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {categoryScores.map((c) => (
                    <Card key={`bottom-heatmap-${c.category}`} className="p-3 bg-muted/20">
                      <div className="text-sm font-medium">{c.category}</div>
                      <div className="text-xs text-muted-foreground mt-1">Critical {c.critical} | Medium {c.medium} | Compliant {c.compliant}</div>
                    </Card>
                  ))}
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="remediation" className="space-y-3">
              {remediationPlan.map((r) => (
                <Card key={`bottom-${r.step}-${r.action}`} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t("common.step")} {r.step}: {r.action}</div>
                    <Badge variant="outline">{r.priority}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{t("common.owner")}: {r.owner}</div>
                </Card>
              ))}
              {!remediationPlan.length ? <Card className="p-4 text-sm text-muted-foreground">No remediation plan available.</Card> : null}
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}

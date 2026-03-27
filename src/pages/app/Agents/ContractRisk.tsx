import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useRef } from "react";
import { AlertTriangle, CheckCircle, Download, ExternalLink, FileText, Info, Play, RefreshCw, Scale, ShieldAlert } from "lucide-react";
import { FadeIn } from "@/lib/magic-ui";
import { useAppStore } from "@/store";
import { caseService } from "@/services/caseService";
import { authService } from "@/services/authService";
import { useContractRisk } from "@/hooks/useContractRisk";
import { apiClient } from "@/services/apiClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import AgentReportBackButton from "@/components/app/AgentReportBackButton";
import { canOpenSourceDocument, getSourceActionLabel, getSourceDisplayName, getSourceLeadLabel, isPastedSource } from "@/lib/sourceDocument";
import { openAgentCase } from "@/lib/agentCaseNavigation";

type CaseListItem = { case_id: string; title: string; domain: string; updated_at: string; last_run_status: string | null };

type Severity = "high" | "medium" | "low";

function severityVariant(sev: Severity) {
  return sev === "high" ? "destructive" : sev === "medium" ? "secondary" : "outline";
}

function MetricCard({ tone, label, sublabel, value, valid }: { tone: Severity; label: string; sublabel: string; value?: number; valid: boolean }) {
  const Icon = !valid ? Info : tone === "low" ? CheckCircle : AlertTriangle;
  const iconClass = !valid ? "text-muted-foreground" : tone === "high" ? "text-red-400" : tone === "medium" ? "text-yellow-300" : "text-emerald-400";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">{valid ? (typeof value === "number" ? value : "—") : "—"}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{valid ? sublabel : "Not available"}</div>
        </div>
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
    </Card>
  );
}

function getContractRiskReviewMessage() {
  return "Review this contract-risk output carefully before relying on it. Some contract-specific details still need stronger support from the uploaded materials.";
}

function isContractRiskAdvisoryReason(value: unknown) {
  const text = String(value || "").toLowerCase();
  if (!text.trim()) return false;
  return /not\s+a\s+contract|non[-\s]?contract|litigation pleading|case document|court pleading|agreement document|requires a contract|not a contract\/agreement|insufficient contract text|does not appear to be a complete contract|incomplete contract/i.test(text);
}

export default function ContractRisk() {
  const [matchCaseRoute, params] = useRoute("/app/cases/:caseId/agents/contract-risk");
  const [matchResultsRoute, resultsParams] = useRoute("/app/cases/:caseId/agents/contract-risk/results");
  const [location, setLocation] = useLocation();
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const casesById = useAppStore((s) => s.casesById);
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const caseId = matchCaseRoute ? params.caseId : matchResultsRoute ? resultsParams.caseId : undefined;
  const selectedRunId = useMemo(() => {
    const raw = String(location || "");
    const queryIndex = raw.indexOf("?");
    const search = queryIndex >= 0 ? raw.slice(queryIndex + 1) : (typeof window !== "undefined" ? window.location.search.slice(1) : "");
    const value = new URLSearchParams(search).get("runId");
    return value && value.trim() ? value.trim() : undefined;
  }, [location]);
  const [resolvingDefaultCase, setResolvingDefaultCase] = useState(false);
  const { state, overview, output, runStatus, error, diagnostics, startRun, exportUrl } = useContractRisk(caseId, selectedRunId);
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const defaultCaseRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!casePickerOpen) return;
    setLoadingCases(true);
    caseService.listCases().then((rows) => setCases(rows as any)).catch(() => setCases([])).finally(() => setLoadingCases(false));
  }, [casePickerOpen]);

  useEffect(() => {
    const title = (overview as any)?.case?.title;
    if (caseId && typeof title === "string" && title.trim()) {
      setCaseWorkspace(caseId, title.trim());
    }
  }, [overview, caseId, setCaseWorkspace]);

  useEffect(() => {
    if (matchCaseRoute || matchResultsRoute) {
      defaultCaseRedirectRef.current = null;
      return;
    }
    let cancelled = false;
    const resolveActiveCase = async () => {
      let targetCaseId = activeCaseId || "";
      if (!targetCaseId) {
        try {
          const me = await authService.me();
          targetCaseId = (me as any)?.active_case_id || "";
          if (targetCaseId) setActiveCaseId(targetCaseId);
        } catch {}
      }
      if (!targetCaseId) return;
      if (defaultCaseRedirectRef.current === targetCaseId) return;
      defaultCaseRedirectRef.current = targetCaseId;
      setResolvingDefaultCase(true);
      try {
        const title = useAppStore.getState().casesById[targetCaseId]?.title || "Current Case Workspace";
        await openAgentCase({
          agentKey: "contract_risk_dispute_settlement",
          caseId: targetCaseId,
          title,
          setLocation,
        });
      } finally {
        if (!cancelled) setResolvingDefaultCase(false);
      }
    };
    void resolveActiveCase();
    return () => {
      cancelled = true;
    };
  }, [matchCaseRoute, matchResultsRoute, activeCaseId, setActiveCaseId, setLocation]);

  const qa = (output?.qa_debug || {}) as Record<string, any>;
  const evidenceBackedFindings = Number(qa.evidence_backed_findings || 0);
  const totalClausesFound = Number(output?.counts?.total_clauses_found || 0);
  const citationsCount = Array.isArray(output?.citations) ? (output?.citations?.length || 0) : 0;
  const analysisValid =
    overview?.latest_output_status === "done" &&
    !!output &&
    (evidenceBackedFindings > 0 || totalClausesFound > 0 || citationsCount > 0);
  const hasRenderableOutput = !!output;
  const fallbackLike = !!output && !analysisValid;
  const isNonContractAdvisory =
    isContractRiskAdvisoryReason(output?.failure_reason) ||
    isContractRiskAdvisoryReason(overview?.latest?.failure_reason) ||
    String(output?.qa_debug?.advisory_mode || "") === "non_contract_case_document" ||
    /case\s*\/\s*pleading document/i.test(String(output?.doc_summary?.doc_type_guess || ""));
  const canExport = !!output && state === "done" && (analysisValid || isNonContractAdvisory);
  const explicitFailure =
    state === "error" ||
    overview?.latest_output_status === "error" ||
    runStatus?.status === "FAILED";
  const rawFailureReason =
    (typeof output?.failure_reason === "string" && output.failure_reason.trim()) ||
    (typeof overview?.latest?.failure_reason === "string" && overview.latest.failure_reason.trim()) ||
    (typeof qa.llm_failed === "string" && qa.llm_failed.trim()) ||
    (typeof runStatus?.error === "string" && runStatus.error.trim()) ||
    (typeof diagnostics?.lastPollError === "string" && diagnostics.lastPollError.trim()) ||
    (typeof error === "string" && error.trim()) ||
    "";
  const debugFailureReason = (() => {
    const msg = String(rawFailureReason || "").trim();
    if (!msg) return "Partial output or no evidence-backed findings.";
    if (/operation was aborted|aborted/i.test(msg)) {
      return "LLM refinement request was cancelled/aborted (usually timeout or request cancellation). Deterministic fallback was saved.";
    }
    if (/insufficient grounded citations|insufficient grounded evidence|grounded evidence or citations/i.test(msg)) {
      return "Grounding failed: not enough evidence-backed citations/findings for a valid final report.";
    }
    if (/multiple case examples|bundle content/i.test(msg)) {
      return "Input appears to contain multiple case examples or bundled content. Upload/select the exact single contract/case text.";
    }
    return msg;
  })();
  const actionableFailure = explicitFailure;
  const failureBannerTitle =
    !!output
      ? "Analysis completed with warnings. Review before relying on this output."
      : /multiple case examples|bundle content/i.test(rawFailureReason)
        ? "Analysis incomplete (mixed/bundled input). Please retry with the exact document."
        : /insufficient grounded citations|insufficient grounded evidence|grounded evidence or citations/i.test(rawFailureReason)
          ? "Analysis incomplete (grounding failed). Please retry."
          : "Analysis incomplete (model aborted). Please retry.";

  const allFindings = useMemo(() => (output ? [...(output.high_risk_clauses || []), ...(output.medium_risk_clauses || []), ...(output.low_risk_clauses || [])] : []), [output]);
  const categories = useMemo(() => ["all", ...Array.from(new Set(allFindings.map((f) => f.category).filter(Boolean)))], [allFindings]);
  const filteredFindings = useMemo(
    () => allFindings.filter((f) => (severityFilter === "all" || f.severity === severityFilter) && (categoryFilter === "all" || f.category === categoryFilter)),
    [allFindings, severityFilter, categoryFilter],
  );

  const progressPct = runStatus?.steps?.length ? Math.max(...runStatus.steps.map((s) => Number(s.progress || 0))) : 0;
  const stats = runStatus?.stats || { clausesFound: 0, risksDetected: 0, missingClauses: 0 };
  const currentCaseTitle =
    overview?.selected_run?.case_title ||
    (overview as any)?.case?.title ||
    (overview as any)?.query_parsing?.output?.case_title ||
    (caseId && casesById[caseId]?.title) ||
    (cases.find((c) => c.case_id === caseId)?.title) ||
    "Selected Case";
  const primaryDocDisplayName = getSourceDisplayName(overview?.primary_doc, "No case input available");
  const isPastedInput = isPastedSource(overview?.primary_doc);
  const sourceLeadLabel = getSourceLeadLabel(overview?.primary_doc);
  const sourceActionLabel = getSourceActionLabel(overview?.primary_doc);
  const canOpenSource = canOpenSourceDocument(overview?.primary_doc);
  const viewingHistoricalRun = Boolean(overview?.selected_run?.viewing_historical && selectedRunId);

  if (!caseId) {
    if (resolvingDefaultCase) {
      return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title="Opening latest case" description="Loading the latest case from Query Parsing for Contract Risk Review AI." /></div>;
    }
    return <div className="p-6 md:p-8 max-w-6xl mx-auto"><EmptyState title="No case selected" description="Go to Query Parsing to create or open a case, then use Contract Risk Review AI." actionLabel="Open Query Parsing" onAction={() => setLocation("/app/agents/query")} icon={<ShieldAlert className="h-6 w-6" />} /></div>;
  }
  if (state === "loading" && !overview) {
    return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title="Loading contract risk review" description="Reading Query Parsing document and latest analysis state." /></div>;
  }
  const viewDoc = () => {
    const docId = overview?.primary_doc?.doc_id;
    if (docId) setLocation(`/app/cases/${caseId}/documents/${docId}`);
  };
  const switchCase = async (row: CaseListItem) => {
    setCasePickerOpen(false);
    await openAgentCase({
      agentKey: "contract_risk_dispute_settlement",
      caseId: row.case_id,
      title: row.title,
      setLocation,
    });
  };
  const downloadExportPdf = async () => {
    if (!canExport || !exportUrl) return;
    try {
      await apiClient.download(exportUrl, { filename: `contract-risk-${caseId}.pdf` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      window.alert(message);
    }
  };
  const analyzeCurrentCase = async (force: boolean) => {
    if (!caseId) return;
    if (selectedRunId) {
      setLocation(`/app/cases/${encodeURIComponent(caseId)}/agents/contract-risk/results`);
      return;
    }
    await startRun(force);
  };

  const showRecoveryPanel = !hasRenderableOutput && actionableFailure;
  const docTypeGuess = String(output?.doc_summary?.doc_type_guess || "").toLowerCase();
  const docTypeConfidence = Number(((output?.doc_summary as any)?.doc_type_confidence ?? (output?.doc_summary as any)?.confidence ?? 1));
  const missingTentative = !!output && (!docTypeGuess || docTypeGuess.includes("unknown") || docTypeConfidence < 0.6);
  const hasExistingResult = !!output || overview?.latest_output_status === "done";
  const primaryRunLabel = hasExistingResult ? "Re-run Analysis" : "Analyze Now";
  const primaryRunForce = hasExistingResult;
  const showPrimaryRunAction = !analysisValid && !isNonContractAdvisory;

  return (
    <div className="p-6 pt-10 md:p-8 md:pt-14 max-w-7xl mx-auto space-y-6">
      <Dialog open={casePickerOpen} onOpenChange={setCasePickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Switch Case</DialogTitle>
            <DialogDescription>Select a case to open Contract Risk Review AI for that case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {loadingCases ? <div className="text-sm text-muted-foreground">Loading case history...</div> : null}
            {!loadingCases && !cases.length ? <div className="text-sm text-muted-foreground">No cases found.</div> : null}
            {cases.map((row) => (
              <button key={row.case_id} type="button" onClick={() => switchCase(row)} className="w-full text-left rounded-md border p-3 hover:border-primary transition-colors">
                <div className="flex items-center justify-between gap-2"><div><div className="font-medium">{row.title}</div><div className="text-xs text-muted-foreground font-mono">{row.case_id}</div></div><div className="text-right text-xs text-muted-foreground"><div>{row.last_run_status || "Active"}</div><div>{new Date(row.updated_at).toLocaleString()}</div></div></div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <FadeIn>
        <div className="space-y-4">
          <AgentReportBackButton fallbackHref={`/app/cases/${caseId}/agents/query-parsing`} fallbackLabel="Back to Query Parsing" />
          <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">Agent Analysis</div>
            <h1 className="text-3xl font-bold font-heading">Contract Risk Review AI</h1>
            <p className="text-muted-foreground mt-1">Contract Risk + Dispute Resolution & Settlement</p>
            <div className="mt-2 flex items-center gap-2 text-sm"><Badge variant="outline">Case: {currentCaseTitle}</Badge><Button variant="ghost" size="sm" onClick={() => setCasePickerOpen(true)}>Switch Case</Button></div>
          </div>
          </div>
        </div>
      </FadeIn>

      {showRecoveryPanel ? (
        <Card className="p-4 border-amber-500/40 bg-amber-500/10">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div>
                <div className="font-semibold">{failureBannerTitle}</div>
                <div className="text-sm text-muted-foreground">{getContractRiskReviewMessage()}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {qa.run_id ? `Run ${String(qa.run_id)}` : "Run unavailable"}
                  {qa.doc_hash ? ` | Doc ${String(qa.doc_hash).slice(0, 12)}…` : ""}
                  {typeof qa.evidence_backed_findings !== "undefined" ? ` | Evidence-backed findings: ${Number(qa.evidence_backed_findings || 0)}` : ""}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {diagnostics?.lastStartStatus ? `Start: ${diagnostics.lastStartStatus}` : "Start: —"}
                  {diagnostics?.lastStartRunId ? ` | Run: ${diagnostics.lastStartRunId}` : ""}
                  {diagnostics?.lastPollStatus ? ` | Poll: ${diagnostics.lastPollStatus}` : ""}
                  {diagnostics?.lastPollStage ? ` | Step: ${diagnostics.lastPollStage}` : ""}
                </div>
              </div>
            </div>
            <Button onClick={() => void startRun(true)}><RefreshCw className="h-4 w-4 mr-2" />Retry Analysis</Button>
          </div>
        </Card>
      ) : null}

      {!showRecoveryPanel && isNonContractAdvisory ? (
        <Card className="p-4 border-blue-500/30 bg-blue-500/5">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <div className="font-semibold">Advisory result</div>
              <div className="text-sm text-muted-foreground">This file looks like a court pleading or case document rather than a full contract, so the report shows procedural and evidence-risk guidance instead of clause-by-clause contract review.</div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">{viewingHistoricalRun ? "Viewing saved analysis" : sourceLeadLabel}</p>
                <h2 className="font-semibold text-lg">{currentCaseTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {viewingHistoricalRun
                    ? `Saved run from ${new Date(String(overview?.selected_run?.timestamp || "")).toLocaleString()}`
                    : primaryDocDisplayName}
                </p>
                {overview?.primary_doc ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {!viewingHistoricalRun ? (
                      <>
                        <Badge variant="outline">{overview.primary_doc.mime_type}</Badge>
                        <Badge variant="outline">{overview.primary_doc.language}</Badge>
                        {isPastedInput ? <Badge variant="outline">Text Query</Badge> : null}
                        {!isPastedInput && overview.primary_doc.pages ? <Badge variant="outline">{overview.primary_doc.pages} pages</Badge> : null}
                        {isPastedInput && typeof (overview as any)?.primary_doc?.char_count === "number"
                          ? <Badge variant="outline">{Number((overview as any).primary_doc.char_count).toLocaleString()} chars</Badge>
                          : null}
                        <Badge variant="outline">Updated {new Date(overview.primary_doc.updated_at).toLocaleString()}</Badge>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">Saved Analysis</Badge>
                        <Badge variant="outline">Run {String(selectedRunId).slice(0, 8)}</Badge>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Upload a contract document in Query Parsing for this case, then return here to analyze it.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {canOpenSource && !viewingHistoricalRun ? <Button variant="outline" onClick={viewDoc}>{sourceActionLabel}</Button> : null}
                {showPrimaryRunAction ? <Button onClick={() => void analyzeCurrentCase(primaryRunForce)} disabled={state === "analyzing" || !overview?.primary_doc}><Play className="h-4 w-4 mr-2" />{viewingHistoricalRun ? "Analyze Current Case" : primaryRunLabel}</Button> : null}
                <Button variant="outline" disabled={!canExport} onClick={() => void downloadExportPdf()}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report PDF
                </Button>
                <Button variant="ghost" onClick={() => setCasePickerOpen(true)}>Switch Case</Button>
              </div>
            </div>
          </Card>

          <Card className="p-5"><p className="text-sm font-medium mb-2">What we analyze</p><div className="flex flex-wrap gap-2 text-xs">{["Liability clauses", "Termination", "Payment terms", "IP rights", "Confidentiality", "Dispute resolution", "Force majeure", "Indemnification"].map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div></Card>

          <Card className="p-5">
            <p className="text-sm font-medium mb-3">Recent Analyses</p>
            <div className="space-y-2">
              {(overview?.recent_runs || []).map((r) => (
                (() => {
                  const rawTitle = String(r.case_title || "").trim();
                  const shortId = String(r.case_id || "").slice(0, 8);
                  const rowTitle = rawTitle || (shortId ? `Case ${shortId}` : "Case Workspace");
                  return (
                <button
                  key={r.run_id}
                  type="button"
                  onClick={() => {
                    if (!r.case_id) return;
                    setLocation(`/app/cases/${encodeURIComponent(r.case_id)}/agents/contract-risk/results?runId=${encodeURIComponent(r.run_id)}`);
                  }}
                  className="w-full text-left flex items-center justify-between rounded-md border p-2 text-sm gap-3 hover:border-primary transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{rowTitle}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {shortId ? `ID: ${shortId}` : "ID: n/a"}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{r.status || "Unknown"}</Badge>
                      {r.risk_level ? <Badge>{r.risk_level}</Badge> : null}
                      {selectedRunId === r.run_id ? <Badge variant="secondary">Viewing</Badge> : null}
                    </div>
                  </div>
                  <span className="text-muted-foreground shrink-0">{new Date(r.timestamp).toLocaleString()}</span>
                </button>
                  );
                })()
              ))}
              {!overview?.recent_runs?.length ? <div className="text-sm text-muted-foreground">No recent analyses yet.</div> : null}
            </div>
          </Card>

          {state === "analyzing" ? (
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-3"><RefreshCw className="h-5 w-5 animate-spin text-primary" /><div><h3 className="font-semibold text-lg">Analyzing Contract...</h3><p className="text-sm text-muted-foreground">{runStatus?.stage || "Preparing analysis"}</p></div></div>
              <Progress value={progressPct} className="h-2" />
              <div className="grid md:grid-cols-2 gap-4"><div className="space-y-2">{(runStatus?.steps || []).map((s, i) => <div key={`${s.name}-${i}`} className="flex items-center justify-between text-sm"><span className={s.state === "RUNNING" ? "text-primary" : "text-muted-foreground"}>{s.name}</span><Badge variant={s.state === "SUCCEEDED" ? "default" : s.state === "RUNNING" ? "secondary" : "outline"}>{s.state}</Badge></div>)}</div><Card className="p-4 bg-muted/20"><div className="grid grid-cols-3 gap-3 text-center"><div><div className="text-xl font-semibold">{stats.clausesFound}</div><div className="text-xs text-muted-foreground">Clauses Found</div></div><div><div className="text-xl font-semibold">{stats.risksDetected}</div><div className="text-xs text-muted-foreground">Risks Detected</div></div><div><div className="text-xl font-semibold">{stats.missingClauses}</div><div className="text-xs text-muted-foreground">Missing Clauses</div></div></div></Card></div>
            </Card>
          ) : null}

      {state === "error" ? <ErrorState title="Contract risk analysis failed" description={error || "Please retry."} actionLabel="Retry Analysis" onAction={() => void startRun(true)} /> : null}

          {showRecoveryPanel ? (
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold">Recovery Panel</h3>
              <div className="text-sm text-muted-foreground">Failure reason: {debugFailureReason}</div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <div>LLM attempted: {String(Boolean(qa.llm_attempted ?? qa?.llm?.llm_attempted ?? qa.llm_failed))}</div>
                <div>Mode: {String(overview?.latest?.mode || "unknown")}</div>
                <div>Evidence-backed findings: {Number(qa.evidence_backed_findings || 0)}</div>
                <div>Current doc hash: {qa.doc_hash ? `${String(qa.doc_hash).slice(0, 16)}…` : "unknown"}</div>
                <div>Backend start status: {diagnostics?.lastStartStatus || "—"}</div>
                <div>Last polled status: {diagnostics?.lastPollStatus || "—"}{diagnostics?.lastPollStage ? ` (${diagnostics.lastPollStage})` : ""}</div>
                <div>Last polled error: {diagnostics?.lastPollError || "—"}</div>
              </div>
              <div className="flex gap-2 flex-wrap"><Button onClick={() => void startRun(true)}><RefreshCw className="h-4 w-4 mr-2" />Retry Analysis</Button><Button variant="outline" disabled title="Light analysis profile is not supported in this build">Light analysis</Button></div>
            </Card>
          ) : !output && state !== "error" && state !== "analyzing" ? (
            <EmptyState
              title={overview && !overview.primary_doc ? "No contract document found for this case" : "Not analyzed yet. Click Analyze Now."}
              description={
                overview && !overview.primary_doc
                  ? "Contract Risk Review AI uses the document/text already saved in Query Parsing for this case. Add or select a case with Query Parsing input."
                  : "This agent uses the selected case workspace from Query Parsing. Run analysis to generate a contract risk report."
              }
              actionLabel={overview?.primary_doc ? "Analyze Now" : undefined}
              onAction={overview?.primary_doc ? (() => void startRun(false)) : undefined}
            />
          ) : output ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid grid-cols-5 w-full"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="clauses">Clause Analysis</TabsTrigger><TabsTrigger value="missing">Missing Clauses</TabsTrigger><TabsTrigger value="suggestions">Suggestions</TabsTrigger><TabsTrigger value="dispute">Dispute Resolution</TabsTrigger></TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4"><h3 className="font-semibold mb-3">Risk Distribution</h3>{evidenceBackedFindings > 0 ? <div className="space-y-3">{Object.entries(output.risk_distribution || {}).map(([k, v]) => <div key={k}><div className="flex justify-between text-sm mb-1"><span>{k}</span><span>{v}</span></div><Progress value={Math.min(100, (Number(v) / Math.max(1, totalClausesFound)) * 100)} className="h-2" /></div>)}</div> : <div className="text-sm text-muted-foreground">No evidence-backed findings.</div>}</Card>
                  <Card className="p-4"><h3 className="font-semibold mb-3">Action Required</h3><div className="space-y-2 text-sm">{(output.high_risk_clauses || []).slice(0, 3).map((f) => <div key={f.id} className="rounded-md border p-2"><div className="font-medium">{f.title}</div><div className="text-muted-foreground line-clamp-2">{f.issue}</div></div>)}{!output.high_risk_clauses?.length ? <div className="text-muted-foreground">No high-risk issues found in agent output.</div> : null}</div></Card>
                </div>
              </TabsContent>

              <TabsContent value="clauses" className="space-y-4">
                <Card className="p-4 flex flex-wrap gap-2 items-center">{(["all", "high", "medium", "low"] as const).map((s) => <Button key={s} size="sm" variant={severityFilter === s ? "default" : "outline"} onClick={() => setSeverityFilter(s)}>{s[0].toUpperCase() + s.slice(1)}</Button>)}<div className="ml-auto w-64"><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}</SelectContent></Select></div></Card>
                {filteredFindings.map((f) => <Card key={f.id} className="p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{f.title}</h3><p className="text-xs text-muted-foreground">{f.category}</p></div><div className="flex items-center gap-2"><Badge variant={severityVariant(f.severity) as any}>{f.severity.toUpperCase()}</Badge><Badge variant="outline">{Math.round(Number(f.confidence || 0))}%</Badge></div></div><p className="text-sm"><span className="font-medium">Issue:</span> {f.issue}</p><p className="text-sm"><span className="font-medium">Impact:</span> {f.impact}</p><div className="text-sm"><div className="font-medium mb-1">Recommendation</div><ul className="list-disc pl-5 space-y-1">{(f.recommendation || []).slice(0, 4).map((r, idx) => <li key={idx}>{r}</li>)}</ul></div><div className="rounded-md border bg-muted/20 p-3 text-sm"><div className="font-medium mb-1">Suggested Rewrite</div>{f.suggested_rewrite}</div><div className="rounded-md border p-3 text-sm"><div className="flex items-center justify-between gap-2 mb-1"><span className="font-medium">Evidence snippet</span>{f.evidence ? <Button variant="ghost" size="sm" onClick={viewDoc}>View in document <ExternalLink className="h-3 w-3 ml-1" /></Button> : <Badge variant="outline">needs review</Badge>}</div><p className="text-muted-foreground">{f.evidence?.snippet || "No evidence snippet extracted; manual review required."}</p></div></Card>)}
                {!filteredFindings.length ? <Card className="p-4 text-sm text-muted-foreground">No clause findings match current filters.</Card> : null}
              </TabsContent>

              <TabsContent value="missing" className="space-y-3">
                {missingTentative ? <Card className="p-4 border-amber-500/30 bg-amber-500/5 text-sm">Contract type unclear — missing clause suggestions are tentative.</Card> : null}
                {(output.missing_clauses_list || []).map((m) => <Card key={m.id} className="p-4 space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">{m.clause_name}</h3><Badge variant="outline">{typeof m.confidence === "number" ? `${Math.round(m.confidence)}%` : "—"}</Badge></div><p className="text-sm"><span className="font-medium">Why it matters:</span> {m.why_it_matters}</p><div className="rounded-md border p-3 text-sm bg-muted/20"><span className="font-medium">Suggested text:</span> {m.suggested_text}</div></Card>)}
                {!(output.missing_clauses_list || []).length ? <Card className="p-4 text-sm text-muted-foreground">No missing clauses detected (based on contract type).</Card> : null}
              </TabsContent>

              <TabsContent value="suggestions" className="space-y-4">
                {output.suggestions ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="p-4"><h3 className="font-semibold mb-2">Negotiation Priorities</h3>{output.suggestions.negotiation_priorities?.length ? <ul className="list-disc pl-5 text-sm space-y-1">{output.suggestions.negotiation_priorities.map((i, idx) => <li key={idx}>{i}</li>)}</ul> : <div className="text-sm text-muted-foreground">No negotiation priorities inferred for this run.</div>}</Card>
                    <Card className="p-4"><h3 className="font-semibold mb-2">Red Flags</h3>{output.suggestions.red_flags?.length ? <ul className="list-disc pl-5 text-sm space-y-1">{output.suggestions.red_flags.map((i, idx) => <li key={idx}>{i}</li>)}</ul> : <div className="text-sm text-muted-foreground">No results yet. Run analysis.</div>}</Card>
                    <Card className="p-4"><h3 className="font-semibold mb-2">Quick Improvements</h3>{output.suggestions.quick_improvements?.length ? <ul className="list-disc pl-5 text-sm space-y-1">{output.suggestions.quick_improvements.map((i, idx) => <li key={idx}>{i}</li>)}</ul> : <div className="text-sm text-muted-foreground">No results yet. Run analysis.</div>}</Card>
                  </div>
                ) : <EmptyState title="No results yet. Run analysis." description="Suggestions will appear after a successful analysis run." />}
              </TabsContent>

              <TabsContent value="dispute" className="space-y-4">
                {output.dispute_resolution_and_settlement ? (
                  <>
                    <Card className="p-4 space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">Dispute Clause</h3><Badge variant={output.dispute_resolution_and_settlement.dispute_clause_found ? "default" : "outline"}>{output.dispute_resolution_and_settlement.dispute_clause_found ? "Found" : "Not clearly found"}</Badge></div><p className="text-sm text-muted-foreground">{output.dispute_resolution_and_settlement.dispute_clause_summary}</p></Card>
                    <div className="grid md:grid-cols-2 gap-4"><Card className="p-4"><h3 className="font-semibold mb-2">Recommended Path</h3>{output.dispute_resolution_and_settlement.recommended_path?.length ? <ol className="list-decimal pl-5 text-sm space-y-1">{output.dispute_resolution_and_settlement.recommended_path.map((i, idx) => <li key={idx}>{i}</li>)}</ol> : <div className="text-sm text-muted-foreground">No results yet. Run analysis.</div>}</Card><Card className="p-4"><h3 className="font-semibold mb-2">Negotiation Script</h3><p className="text-sm">{output.dispute_resolution_and_settlement.negotiation_script || "No results yet. Run analysis."}</p></Card></div>
                    <Card className="p-4"><h3 className="font-semibold mb-2">Settlement Options</h3><div className="space-y-3">{output.dispute_resolution_and_settlement.settlement_options?.length ? output.dispute_resolution_and_settlement.settlement_options.map((o, idx) => <div key={idx} className="rounded-md border p-3 text-sm"><div className="font-medium">{o.option}</div><div><span className="font-medium">When:</span> {o.when_to_use}</div><div><span className="font-medium">Upside:</span> {o.upside}</div><div><span className="font-medium">Risk:</span> {o.risk}</div></div>) : <div className="text-sm text-muted-foreground">No results yet. Run analysis.</div>}</div></Card>
                    <Card className="p-4"><h3 className="font-semibold mb-2">Red Flags to Avoid</h3>{output.dispute_resolution_and_settlement.red_flags_to_avoid?.length ? <ul className="list-disc pl-5 text-sm space-y-1">{output.dispute_resolution_and_settlement.red_flags_to_avoid.map((i, idx) => <li key={idx}>{i}</li>)}</ul> : <div className="text-sm text-muted-foreground">No results yet. Run analysis.</div>}</Card>
                  </>
                ) : <EmptyState title="No results yet. Run analysis." description="Dispute resolution guidance will appear after a successful analysis run." />}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="p-5"><div className="flex items-center justify-between"><div><div className={`text-4xl font-bold ${hasRenderableOutput ? (output?.scores?.risk_level === "High" ? "text-red-400" : output?.scores?.risk_level === "Medium" ? "text-yellow-300" : output?.scores?.risk_level === "Low" ? "text-emerald-300" : "text-blue-400") : "text-muted-foreground"}`}>{hasRenderableOutput ? (typeof output?.scores?.overall_risk_score === "number" ? output.scores.overall_risk_score.toFixed(1) : "N/A") : "N/A"}</div><div className="text-sm text-muted-foreground">Overall Risk Score (0-10)</div></div><Scale className="h-8 w-8 text-primary" /></div>{hasRenderableOutput && output?.scores?.risk_level ? <Badge className="mt-3">{output.scores.risk_level}</Badge> : null}</Card>
          <div className="grid gap-3">
            <MetricCard tone="high" valid={hasRenderableOutput} value={output?.counts?.high_risk} label="High Risk Clauses" sublabel="Requires attention" />
            <MetricCard tone="medium" valid={hasRenderableOutput} value={output?.counts?.medium_risk} label="Medium Risk Clauses" sublabel="Review recommended" />
            <MetricCard tone="low" valid={hasRenderableOutput} value={output?.counts?.low_risk} label="Low Risk Clauses" sublabel="Acceptable" />
          </div>
          <Card className="p-4"><div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /><h3 className="font-semibold">Relevant Citations</h3></div><div className="space-y-2 text-sm">{(output?.citations || []).map((c, idx) => <div key={`${c.doc_id}-${idx}`} className="rounded-md border p-2"><div className="text-xs text-muted-foreground mb-1">USER_DOC {c.page ? `• Page ${c.page}` : ""}</div><div>{c.snippet}</div></div>)}{!output?.citations?.length ? <div className="text-muted-foreground">No results yet. Run analysis.</div> : null}</div></Card>
        </div>
      </div>
    </div>
  );
}

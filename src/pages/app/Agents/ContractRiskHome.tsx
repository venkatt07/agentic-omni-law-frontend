import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Play, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/store";
import { authService } from "@/services/authService";
import { caseService } from "@/services/caseService";
import { contractRiskService, type ContractRiskOverview } from "@/services/contractRiskService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useI18n } from "@/hooks/useI18n";
import { canOpenSourceDocument, getSourceActionLabel, getSourceDisplayName, getSourceLeadLabel } from "@/lib/sourceDocument";
import { openAgentCase } from "@/lib/agentCaseNavigation";

type CaseListItem = { case_id: string; title: string; domain: string; updated_at: string; last_run_status: string | null };

export default function ContractRiskHome() {
  const [matchCaseRoute, params] = useRoute("/app/cases/:caseId/agents/contract-risk");
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const caseId = matchCaseRoute ? params.caseId : undefined;
  const [, setLocation] = useLocation();

  const [overview, setOverview] = useState<ContractRiskOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingDefaultCase, setResolvingDefaultCase] = useState(false);
  const [starting, setStarting] = useState(false);
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const defaultCaseRedirectRef = useRef<string | null>(null);
  const { t } = useI18n();
  const forceHome = useMemo(() => {
    const u = new URL(window.location.href);
    return u.searchParams.get("home") === "1";
  }, []);

  useEffect(() => {
    if (matchCaseRoute) {
      defaultCaseRedirectRef.current = null;
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      let targetCaseId = activeCaseId || "";
      if (!targetCaseId) {
        try {
          const me = await authService.me();
          targetCaseId = (me as any)?.active_case_id || "";
          if (targetCaseId) setActiveCaseId(targetCaseId);
        } catch {}
      }
      if (!targetCaseId || cancelled) return;
      if (defaultCaseRedirectRef.current === targetCaseId) return;
      defaultCaseRedirectRef.current = targetCaseId;
      setResolvingDefaultCase(true);
      const targetTitle = useAppStore.getState().casesById[targetCaseId]?.title || t("common.currentCaseWorkspace");
      try {
        await openAgentCase({
          agentKey: "contract_risk_dispute_settlement",
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

  async function load() {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await contractRiskService.getOverview(caseId);
      setOverview(data);
      if ((data as any)?.case?.title) useAppStore.getState().setCaseWorkspace(caseId, (data as any).case.title);
      if (data.latest_output_status === "running" && data.latest_run_id) {
        const analyzingHref = `/app/cases/${caseId}/agents/contract-risk/analyzing?runId=${encodeURIComponent(data.latest_run_id)}`;
        if (typeof window !== "undefined") {
          window.location.replace(analyzingHref);
          return;
        }
        setLocation(analyzingHref, { replace: true } as any);
        return;
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : t("agent.contract.failedLoad");
      setError(msg);
    }
  }

  useEffect(() => {
    if (!caseId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, forceHome]);

  useEffect(() => {
    if (!casePickerOpen) return;
    caseService.listCases().then((rows) => setCases(rows as any)).catch(() => setCases([]));
  }, [casePickerOpen]);

  async function startAnalysis() {
    if (!caseId) return;
    setStarting(true);
    try {
      const started = await contractRiskService.startRun(caseId, true);
      if (started.status === "cached" && started.output) {
        const analyzingHref = `/app/cases/${caseId}/agents/contract-risk/analyzing?cached=1`;
        if (typeof window !== "undefined") {
          window.location.assign(analyzingHref);
          return;
        }
        setLocation(analyzingHref);
        return;
      }
      if (!started.run_id) throw new Error("No run id returned");
      const analyzingHref = `/app/cases/${caseId}/agents/contract-risk/analyzing?runId=${encodeURIComponent(started.run_id)}`;
      if (typeof window !== "undefined") {
        window.location.assign(analyzingHref);
        return;
      }
      setLocation(analyzingHref);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("agent.contract.analyzeNow");
      setError(msg);
    } finally {
      setStarting(false);
    }
  }

  if (!caseId) {
    if (resolvingDefaultCase) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title={t("agent.contract.opening")} description={t("common.loadingSelectedCase")} /></div>;
    return <div className="p-6 md:p-8 max-w-6xl mx-auto"><EmptyState title={t("common.noCaseSelected")} description={t("agent.outcome.noActiveCaseDescription")} actionLabel={t("common.openQueryParsing")} onAction={() => setLocation("/app/agents/query")} /></div>;
  }
  if (loading) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title={t("agent.contract.loading")} description={t("agent.contract.loadingDescription")} /></div>;
  if (error) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><ErrorState title={t("agent.contract.failedLoad")} description={error} actionLabel={t("common.retry")} onAction={() => void load()} /></div>;

  const caseTitle = (overview as any)?.case?.title || useAppStore.getState().casesById[caseId]?.title || t("common.selectedCase");
  const sourceTitle = getSourceDisplayName(overview?.primary_doc, t("agent.policy.noCaseDocument"));
  const sourceLeadLabel = getSourceLeadLabel(overview?.primary_doc);
  const sourceActionLabel = getSourceActionLabel(overview?.primary_doc);
  const canOpenSource = canOpenSourceDocument(overview?.primary_doc);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <Dialog open={casePickerOpen} onOpenChange={setCasePickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("common.switchCase")}</DialogTitle>
            <DialogDescription>{t("agent.contract.casePickerDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {cases.map((row) => (
              <button
                key={row.case_id}
                type="button"
                  onClick={() => {
                    setCasePickerOpen(false);
                    void openAgentCase({
                      agentKey: "contract_risk_dispute_settlement",
                      caseId: row.case_id,
                      title: row.title,
                      setLocation,
                    });
                  }}
                className="w-full text-left rounded-md border p-3 hover:border-primary transition-colors"
              >
                <div className="font-medium">{row.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(row.updated_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-heading">{t("agent.contract.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("agent.contract.subtitle")}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">Case: {caseTitle}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setCasePickerOpen(true)}>{t("common.switchCase")}</Button>
          </div>
        </div>
        <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/query-parsing`)}>{t("common.backToQueryParsing")}</Button>
      </div>

      <Card className="p-5 space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{sourceLeadLabel}</p>
          <h2 className="font-semibold text-lg">{sourceTitle}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {canOpenSource ? <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/documents/${overview?.primary_doc?.doc_id}`)}>{sourceActionLabel}</Button> : null}
          <Button onClick={() => void startAnalysis()} disabled={starting || !overview?.primary_doc}>
            <Play className="h-4 w-4 mr-2" />
            {t("agent.contract.analyzeNow")}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-medium mb-3">{t("agent.contract.recentAnalyses")}</div>
        <div className="space-y-2">
          {(overview?.recent_runs || []).map((r) => {
            const rawTitle = String(r.case_title || "").trim();
            const shortId = String(r.case_id || "").slice(0, 8);
            const rowTitle = rawTitle || (shortId ? `Case ${shortId}` : caseTitle || t("common.caseWorkspace"));
            return (
              <button
                key={r.run_id}
                type="button"
                onClick={() => {
                  if (r.case_id) {
                    void openAgentCase({
                      agentKey: "contract_risk_dispute_settlement",
                      caseId: r.case_id,
                      title: r.case_title || "Case Workspace",
                      setLocation,
                    });
                    return;
                  }
                  if (caseId) {
                    void openAgentCase({
                      agentKey: "contract_risk_dispute_settlement",
                      caseId,
                      title: caseTitle,
                      setLocation,
                    });
                  }
                }}
                className="w-full text-left rounded-md border p-2 text-sm flex items-center justify-between gap-3 hover:border-primary transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium">{rowTitle}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {shortId ? `ID: ${shortId}` : `ID: ${t("common.notAvailable")}`}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{r.status}</Badge>
                    {r.risk_level ? <Badge>{r.risk_level}</Badge> : null}
                  </div>
                </div>
                <span className="text-muted-foreground shrink-0">{new Date(r.timestamp).toLocaleString()}</span>
              </button>
            );
          })}
          {!overview?.recent_runs?.length ? <div className="text-sm text-muted-foreground">{t("agent.contract.noRecentAnalyses")}</div> : null}
        </div>
      </Card>

      {!overview?.primary_doc ? (
        <Card className="p-5 border-amber-500/40 bg-amber-500/10">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-300 mt-0.5" />
            <div className="text-sm text-muted-foreground">{t("agent.contract.noPrimaryDocument")}</div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

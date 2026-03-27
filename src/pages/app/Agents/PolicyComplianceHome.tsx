import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useRef } from "react";
import { Play } from "lucide-react";
import { authService } from "@/services/authService";
import { caseService } from "@/services/caseService";
import { policyComplianceService, type PolicyComplianceMeta } from "@/services/policyComplianceService";
import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useI18n } from "@/hooks/useI18n";
import { canOpenSourceDocument, getSourceActionLabel, getSourceDisplayName, getSourceLeadLabel, hasPageCount, isPastedSource } from "@/lib/sourceDocument";
import { openAgentCase } from "@/lib/agentCaseNavigation";

type CaseListItem = { case_id: string; title: string; domain: string; updated_at: string; last_run_status: string | null };

export default function PolicyComplianceHome() {
  const [matched, params] = useRoute("/app/cases/:caseId/agents/policy-compliance");
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const caseId = matched ? params.caseId : undefined;
  const [, setLocation] = useLocation();

  const [meta, setMeta] = useState<PolicyComplianceMeta | null>(null);
  const [framework, setFramework] = useState("Indian Contract & Commercial");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingDefaultCase, setResolvingDefaultCase] = useState(false);
  const [starting, setStarting] = useState(false);
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const defaultCaseRedirectRef = useRef<string | null>(null);
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
    if (matched) {
      defaultCaseRedirectRef.current = null;
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      let targetCaseId = activeCaseId || "";
      let targetTitle = t("common.currentCaseWorkspace");
      if (targetCaseId) {
        targetTitle = useAppStore.getState().casesById[targetCaseId]?.title || targetTitle;
      } else {
        try {
          const rows = await caseService.listCases();
          if (rows?.length) {
            targetCaseId = rows[0].case_id;
            targetTitle = rows[0].title || targetTitle;
          }
        } catch {}
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
  }, [activeCaseId, matched, setActiveCaseId, setLocation, t]);

  async function load() {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(policyComplianceService.getMeta(caseId), 25000, "Policy Compliance load");
      setMeta(data);
      setLoadAttempt(0);
      setFramework(data.frameworks?.[0] || "Indian Contract & Commercial");
      if (data.case?.title) useAppStore.getState().setCaseWorkspace(caseId, data.case.title);
      if (data.latest.status === "running" && data.latest.run_id) {
        const analyzingHref = `/app/cases/${caseId}/agents/policy-compliance/analyzing?runId=${encodeURIComponent(data.latest.run_id)}`;
        if (typeof window !== "undefined") {
          window.location.replace(analyzingHref);
          return;
        }
        setLocation(analyzingHref, { replace: true } as any);
        return;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t("agent.policy.failedLoad");
      const timedOut = /timed out/i.test(message);
      if (timedOut && loadAttempt < 1) {
        setLoadAttempt((x) => x + 1);
        await new Promise((r) => setTimeout(r, 600));
        return load();
      }
      setError(timedOut ? t("agent.policy.loadTimeout") : message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!caseId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    if (!casePickerOpen) return;
    caseService.listCases().then((rows) => setCases(rows as any)).catch(() => setCases([]));
  }, [casePickerOpen]);

  async function startRun() {
    if (!caseId) return;
    setStarting(true);
    try {
      const res = await policyComplianceService.startRun(caseId, { force: true, framework });
      if (res.status === "cached") {
        const analyzingHref = `/app/cases/${caseId}/agents/policy-compliance/analyzing?cached=1`;
        if (typeof window !== "undefined") {
          window.location.assign(analyzingHref);
          return;
        }
        setLocation(analyzingHref);
        return;
      }
      if (!res.run_id) throw new Error("No run id returned");
      const analyzingHref = `/app/cases/${caseId}/agents/policy-compliance/analyzing?runId=${encodeURIComponent(res.run_id)}`;
      if (typeof window !== "undefined") {
        window.location.assign(analyzingHref);
        return;
      }
      setLocation(analyzingHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("agent.policy.runCheck"));
    } finally {
      setStarting(false);
    }
  }

  if (!caseId) {
    if (resolvingDefaultCase) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title={t("agent.policy.opening")} description={t("common.loadingSelectedCase")} /></div>;
    return <div className="p-6 md:p-8 max-w-6xl mx-auto"><EmptyState title={t("common.noCaseSelected")} description={t("agent.outcome.noActiveCaseDescription")} actionLabel={t("common.openQueryParsing")} onAction={() => setLocation("/app/agents/query")} /></div>;
  }
  if (loading) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title={t("agent.policy.loading")} description={t("agent.policy.loadingDescription")} /></div>;
  if (error) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><ErrorState title={t("agent.policy.failedLoad")} description={error} actionLabel={t("common.retry")} onAction={() => void load()} /></div>;
  const sourceTitle = getSourceDisplayName(meta?.primary_doc, t("agent.policy.noCaseDocument"));
  const sourceLeadLabel = getSourceLeadLabel(meta?.primary_doc);
  const sourceActionLabel = getSourceActionLabel(meta?.primary_doc);
  const canOpenSource = canOpenSourceDocument(meta?.primary_doc);
  const isPastedInput = isPastedSource(meta?.primary_doc);
  const totalWorkspacePages = typeof meta?.workspace_summary?.total_pages === "number" ? meta.workspace_summary.total_pages : null;
  const totalPagesBadge = totalWorkspacePages ?? (hasPageCount(meta?.primary_doc) ? Number(meta?.primary_doc?.pages || 0) : null);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <Dialog open={casePickerOpen} onOpenChange={setCasePickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("common.switchCase")}</DialogTitle>
            <DialogDescription>{t("agent.policy.casePickerDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-auto">
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
                <div className="font-medium">{row.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(row.updated_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-heading">{t("agent.policy.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("agent.policy.subtitle")}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">Case: {meta?.case?.title || t("common.selectedCase")}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setCasePickerOpen(true)}>{t("common.switchCase")}</Button>
          </div>
        </div>
        <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/query-parsing`)}>{t("common.backToQueryParsing")}</Button>
      </div>

      <Card className="p-5">
        <div className="text-sm text-muted-foreground">{sourceLeadLabel}</div>
        <div className="font-semibold text-lg mt-1">{sourceTitle}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {meta?.primary_doc?.mime_type ? <Badge variant="outline">{meta.primary_doc.mime_type}</Badge> : null}
          {isPastedInput ? <Badge variant="outline">Text Query</Badge> : null}
          {totalPagesBadge != null && totalPagesBadge > 0 ? <Badge variant="outline">{totalPagesBadge} total pages</Badge> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(meta?.frameworks || []).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFramework(f)}
              className={`rounded-full border px-3 py-1 text-xs ${framework === f ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {canOpenSource ? <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/documents/${meta?.primary_doc?.doc_id}`)}>{sourceActionLabel}</Button> : null}
          <Button onClick={() => void startRun()} disabled={starting || !meta?.primary_doc}>
            <Play className="h-4 w-4 mr-2" />
            {t("agent.policy.runCheck")}
          </Button>
          <Button variant="outline" disabled={meta?.latest?.status !== "done"} onClick={() => setLocation(`/app/cases/${caseId}/agents/policy-compliance/results`)}>{t("common.viewLatestReport")}</Button>
        </div>
      </Card>
    </div>
  );
}

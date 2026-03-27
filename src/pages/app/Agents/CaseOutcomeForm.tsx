import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/app/PageState";
import { caseOutcomeService } from "@/services/caseOutcomeService";
import { useAppStore } from "@/store";
import { useI18n } from "@/hooks/useI18n";
import { canOpenSourceDocument, getSourceActionLabel } from "@/lib/sourceDocument";

function humanizeCaseType(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const map: Record<string, string> = {
    civil_injunction_finance: "Civil Injunction / Finance",
    loan_harassment_civil_relief: "Loan Harassment / Civil Relief",
    consumer_defect_refund: "Consumer Defect / Refund",
    contract_payment_dispute: "Contract Payment Dispute",
    tenancy_deposit_refund_dispute: "Tenancy Deposit Refund Dispute",
    property_partition_succession: "Property Partition / Succession",
    family_maintenance_dv: "Family Maintenance / Domestic Violence",
    employment_dues_termination: "Employment Dues / Termination",
  };
  const key = raw.toLowerCase();
  if (map[key]) return map[key];
  return raw
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function cleanFactsSummary(value: string | null | undefined) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const deduped: string[] = [];
  const seen = new Set<string>();
  let seenAsk = false;
  for (const s of sentences) {
    const key = s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    if (/\bthe user seeks\b/i.test(s)) {
      if (seenAsk) continue;
      seenAsk = true;
    }
    seen.add(key);
    deduped.push(s);
    if (deduped.length >= 4) break;
  }
  const normalized = deduped.join(" ")
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1, p2) => `${p1}${String(p2).toUpperCase()}`)
    .replace(/\s{2,}/g, " ")
    .trim();
  return normalized;
}

export default function CaseOutcomeForm() {
  const [match, params] = useRoute("/app/cases/:caseId/agents/case-outcome");
  const [, setLocation] = useLocation();
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);
  const caseId = match ? params.caseId : undefined;
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>({});
  const { t } = useI18n();

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoading(true);
    caseOutcomeService.getMeta(caseId)
      .then((m) => {
        if (cancelled) return;
        setMeta(m);
        setCaseWorkspace(caseId, m.case?.title || t("common.caseWorkspace"));
        const defaults = m.prefill_defaults || {};
        setForm({
          case_type: humanizeCaseType(m.latest?.output?.prefill?.case_type || defaults.case_type || ""),
          jurisdiction: m.latest?.output?.prefill?.jurisdiction || defaults.jurisdiction || "India",
          claim_amount: m.latest?.output?.prefill?.claim_amount || defaults.claim_amount || "",
          facts_summary: cleanFactsSummary(m.latest?.output?.prefill?.facts_summary || defaults.facts_summary || m.query_parsing?.output?.executive_summary || ""),
          key_legal_issues: (m.latest?.output?.prefill?.key_legal_issues || defaults.key_legal_issues || []).join("\n"),
          evidence_strength: m.latest?.output?.prefill?.evidence_strength || defaults.evidence_strength || "",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("agent.outcome.loadFailed")))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId, setCaseWorkspace, t]);

  const canViewLatest = meta?.latest?.status === "done" && meta?.latest?.analysis_valid;
  const canPredict = !!caseId;

  const onPredict = async () => {
    if (!caseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const started = await caseOutcomeService.startRun(caseId, { force: true, user_overrides: { ...form } });
      if (started.status === "cached") {
        const analyzingHref = `/app/cases/${caseId}/agents/case-outcome/analyzing?cached=1`;
        if (typeof window !== "undefined") {
          window.location.assign(analyzingHref);
          return;
        }
        setLocation(analyzingHref);
        return;
      }
      if (!started.run_id) throw new Error("No run id returned");
      const analyzingHref = `/app/cases/${caseId}/agents/case-outcome/analyzing?runId=${encodeURIComponent(started.run_id)}`;
      if (typeof window !== "undefined") {
        window.location.assign(analyzingHref);
        return;
      }
      setLocation(analyzingHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("agent.outcome.startFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPrefill = () => {
    if (!meta) return;
    const defaults = meta.prefill_defaults || {};
    setForm({
      case_type: humanizeCaseType(defaults.case_type || ""),
      jurisdiction: defaults.jurisdiction || "India",
      claim_amount: defaults.claim_amount || "",
      facts_summary: cleanFactsSummary(defaults.facts_summary || meta.query_parsing?.output?.executive_summary || ""),
      key_legal_issues: (defaults.key_legal_issues || []).join("\n"),
      evidence_strength: defaults.evidence_strength || "",
    });
  };

  if (!caseId) return <div className="p-6 md:p-8 max-w-5xl mx-auto"><EmptyState title={t("common.noCaseSelected")} description={t("agent.outcome.noActiveCaseDescription")} actionLabel={t("common.openQueryParsing")} onAction={() => setLocation("/app/agents/query")} /></div>;
  if (loading) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title={t("agent.outcome.loading")} description={t("agent.outcome.loadingDescription")} /></div>;
  if (error && !meta) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><EmptyState title={t("agent.outcome.loadFailed")} description={error} actionLabel={t("common.backToQueryParsing")} onAction={() => setLocation(`/app/cases/${caseId}/agents/query-parsing`)} /></div>;

  const title = meta?.case?.title || t("common.caseWorkspace");
  const sourceActionLabel = getSourceActionLabel(meta?.primary_doc);
  const canOpenSource = canOpenSourceDocument(meta?.primary_doc);
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-heading">{t("agent.outcome.formTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("agent.outcome.formSubtitle")}</p>
          <div className="mt-2"><Badge variant="outline">Case: {title}</Badge></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/query-parsing`)}>{t("common.backToQueryParsing")}</Button>
          {canOpenSource ? <Button variant="outline" onClick={() => meta?.primary_doc?.doc_id && setLocation(`/app/cases/${caseId}/documents/${meta.primary_doc.doc_id}`)}>{sourceActionLabel}</Button> : null}
          {canViewLatest ? <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/case-outcome/results`)}>{t("common.viewLatestResult")}</Button> : null}
        </div>
      </div>

      {meta?.latest?.status === "running" ? <Card className="p-4 border-primary/20 bg-primary/5 text-sm">{t("agent.outcome.backgroundRunning")}</Card> : null}
      {meta?.latest?.status === "error" || meta?.latest?.status === "blocked" ? <Card className="p-4 border-amber-500/30 bg-amber-500/5 text-sm">{t("agent.outcome.previousFailed")}</Card> : null}
      <Card className="p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div><div className="text-sm font-medium mb-1">{t("agent.outcome.caseType")}</div><Input value={form.case_type || ""} onChange={(e) => setForm((p: any) => ({ ...p, case_type: e.target.value }))} /></div>
          <div><div className="text-sm font-medium mb-1">{t("agent.outcome.jurisdiction")}</div><Input value={form.jurisdiction || ""} onChange={(e) => setForm((p: any) => ({ ...p, jurisdiction: e.target.value }))} /></div>
          <div><div className="text-sm font-medium mb-1">{t("agent.outcome.claimAmount")}</div><Input value={form.claim_amount || ""} onChange={(e) => setForm((p: any) => ({ ...p, claim_amount: e.target.value }))} /></div>
          <div><div className="text-sm font-medium mb-1">{t("agent.outcome.evidenceStrength")}</div><Input value={form.evidence_strength || ""} onChange={(e) => setForm((p: any) => ({ ...p, evidence_strength: e.target.value }))} /></div>
        </div>
        <div><div className="text-sm font-medium mb-1">{t("agent.outcome.factsSummary")}</div><Textarea rows={5} value={form.facts_summary || ""} onChange={(e) => setForm((p: any) => ({ ...p, facts_summary: e.target.value }))} /></div>
        <div><div className="text-sm font-medium mb-1">{t("agent.outcome.keyLegalIssues")}</div><Textarea rows={4} value={form.key_legal_issues || ""} onChange={(e) => setForm((p: any) => ({ ...p, key_legal_issues: e.target.value }))} /></div>
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <div className="flex gap-2">
          <Button onClick={() => void onPredict()} disabled={!canPredict || submitting}>{submitting ? t("agent.outcome.starting") : t("agent.outcome.predict")}</Button>
          <Button variant="outline" onClick={resetPrefill}>{t("common.reset")}</Button>
        </div>
      </Card>
    </div>
  );
}

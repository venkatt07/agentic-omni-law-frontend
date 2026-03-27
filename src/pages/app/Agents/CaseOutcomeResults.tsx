import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/app/PageState";
import AgentReportBackButton from "@/components/app/AgentReportBackButton";
import { caseOutcomeService, type CaseOutcomeOutput } from "@/services/caseOutcomeService";
import { apiClient } from "@/services/apiClient";

function formatCitationLabel(value: unknown) {
  const label = String(value || "USER_DOC").trim().toUpperCase();
  if (label === "USER_DOC") return "Case Document";
  if (label === "LEGAL_CORPUS") return "Legal Corpus";
  return label;
}

function getOutcomeReviewMessage() {
  return "Review this prediction carefully before relying on it. Some parts may still need stronger case-specific support from the available materials.";
}

export default function CaseOutcomeResults() {
  const [match, params] = useRoute("/app/cases/:caseId/agents/case-outcome/results");
  const [, setLocation] = useLocation();
  const caseId = match ? params.caseId : "";
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [output, setOutput] = useState<CaseOutcomeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoading(true);
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
    (async () => {
      try {
        const m = await withTimeout(caseOutcomeService.getMeta(caseId), 12000, "Meta request");
        if (cancelled) return;
        setMeta(m);
        try {
          const o = await withTimeout(caseOutcomeService.getOutput(caseId), 12000, "Output request");
          if (cancelled) return;
          setOutput(o || m?.latest?.output || null);
        } catch {
          if (cancelled) return;
          setOutput(m?.latest?.output || null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load result");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (!caseId) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <EmptyState title="No case selected" description="Open a case first." actionLabel="Open Query Parsing" onAction={() => setLocation("/app/agents/query")} />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <LoadingState title="Loading outcome result" description="Reading saved prediction report." />
      </div>
    );
  }
  if (error && !output) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <EmptyState title="No results yet" description={error} actionLabel="Go to Outcome Form" onAction={() => setLocation(`/app/cases/${caseId}/agents/case-outcome`)} />
      </div>
    );
  }

  const hasUsableOutput = !!output;
  const strictValid = !!output;
  const showWarning = !!output && output.analysis_valid === false;
  const title = meta?.case?.title || "Case Workspace";
  const downloadExportPdf = async () => {
    if (!strictValid) return;
    try {
      await apiClient.download(caseOutcomeService.getExportUrl(caseId), { filename: `case-outcome-${caseId}.pdf` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      window.alert(message);
    }
  };

  return (
    <div className="p-6 pt-10 md:p-8 md:pt-14 max-w-7xl mx-auto space-y-5">
      <div className="space-y-4">
        <AgentReportBackButton fallbackHref={`/app/cases/${caseId}/agents/case-outcome`} fallbackLabel="Back to Form" />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
          <h1 className="text-3xl font-bold font-heading">Case Outcome Prediction</h1>
          <p className="text-muted-foreground mt-1">Case: {title}</p>
          </div>
          <div className="flex gap-2">
          <Button variant="outline" disabled={!strictValid} onClick={() => void downloadExportPdf()}>
            Export Report
          </Button>
          <Button disabled={!strictValid}>Saved</Button>
          </div>
        </div>
      </div>

      {showWarning ? (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="font-medium">Analysis completed with warnings. Review before relying on this output.</div>
          <div className="text-sm text-muted-foreground mt-1">{getOutcomeReviewMessage()}</div>
          <Button className="mt-3" onClick={() => setLocation(`/app/cases/${caseId}/agents/case-outcome`)}>Retry</Button>
        </Card>
      ) : null}

      {output && hasUsableOutput ? (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-4"><div className="text-sm text-muted-foreground">Prediction Confidence</div><div className="text-3xl font-bold">{Math.round((output.prediction?.confidence || 0) * 100)}%</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Win / Settle / Lose</div><div className="text-sm mt-2">Win {Math.round((output.prediction?.distribution?.win || 0) * 100)}% • Settle {Math.round((output.prediction?.distribution?.settle || 0) * 100)}% • Lose {Math.round((output.prediction?.distribution?.lose || 0) * 100)}%</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Duration / Cost Range</div><div className="text-sm mt-2">{output.ranges?.duration_months ? `${output.ranges.duration_months[0]}–${output.ranges.duration_months[1]} months` : "N/A"}{output.ranges?.award_or_cost_range_inr ? ` • ₹${output.ranges.award_or_cost_range_inr[0]}–₹${output.ranges.award_or_cost_range_inr[1]}` : ""}</div></Card>
          </div>

          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Prefill Summary</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Case Type:</span> {output.prefill?.case_type || "—"}</div>
                  <div><span className="font-medium">Jurisdiction:</span> {output.prefill?.jurisdiction || "—"}</div>
                  <div><span className="font-medium">Claim Amount:</span> {output.prefill?.claim_amount || "—"}</div>
                  <div><span className="font-medium">Evidence Strength:</span> {output.prefill?.evidence_strength || "—"}</div>
                  <div><span className="font-medium">Facts Summary:</span> {output.prefill?.facts_summary || "—"}</div>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Deadlines and Key Timelines</h3>
                {(output.deadlines_and_penalties || []).length ? (
                  <div className="space-y-2">{output.deadlines_and_penalties!.map((d, i) => <div key={`${d.label}-${i}`} className="rounded-md border p-2 text-sm"><div className="font-medium">{d.label}</div>{d.detail ? <div className="text-muted-foreground">{d.detail}</div> : null}</div>)}</div>
                ) : <div className="text-sm text-muted-foreground">No grounded timelines or deadline signals were extracted from available inputs.</div>}
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Recommendations</h3>
                {(output.recommendations || []).length ? <ul className="list-disc pl-5 text-sm space-y-1">{output.recommendations!.map((r, i) => <li key={i}>{r}</li>)}</ul> : <div className="text-sm text-muted-foreground">No recommendations available.</div>}
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Similar Cases</h3>
                {output.similar_corpus_available && output.similar_cases?.length ? <div className="space-y-2">{output.similar_cases.map((s, i) => <div key={i} className="rounded-md border p-2 text-sm"><div className="font-medium">{s.title}</div>{s.summary ? <div className="text-muted-foreground">{s.summary}</div> : null}</div>)}</div> : <div className="text-sm text-muted-foreground">No similar cases available. Enable similar-cases corpus retrieval and index SC/HC case law.</div>}
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Relevant Citations</h3>
                {(output.citations || []).length ? <div className="space-y-2">{output.citations!.map((c, i) => <div key={i} className="rounded-md border p-2 text-sm"><div className="text-xs text-muted-foreground mb-1">{formatCitationLabel(c.source_type)}</div><div>{c.snippet}</div></div>)}</div> : <div className="text-sm text-muted-foreground">No citations.</div>}
              </Card>
            </div>
          </div>
        </>
      ) : null}

      {!output ? (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">No saved outcome result found for this case yet.</div>
        </Card>
      ) : null}

    </div>
  );
}

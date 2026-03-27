import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { contractRiskService } from "@/services/contractRiskService";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/app/PageState";
import AgentProcessingScreen from "@/components/app/AgentProcessingScreen";
import { buildAnalyzingStepRows, computeAnimatedAnalyzingProgressPct } from "./analyzingProgress";

const COMPLETION_SETTLE_MS = 900;

function readRunId() {
  const u = new URL(window.location.href);
  return u.searchParams.get("runId");
}

export default function ContractRiskAnalyzing() {
  const [matched, params] = useRoute("/app/cases/:caseId/agents/contract-risk/analyzing");
  const [, setLocation] = useLocation();
  const caseId = matched ? params.caseId : undefined;
  const queryParams = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    [],
  );
  const cachedReplay = queryParams.get("cached") === "1";
  const [runId, setRunId] = useState<string | null>(() => readRunId());
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const isDoneStatus = (value?: string | null) => ["SUCCEEDED", "DONE", "SUCCESS"].includes(String(value || "").toUpperCase());
  const isErrorStatus = (value?: string | null) => ["FAILED", "ERROR", "CANCELLED", "ABORTED"].includes(String(value || "").toUpperCase());

  useEffect(() => {
    if (!caseId || runId || !cachedReplay) return;
    setStatus({
      status: "RUNNING",
      progress: { step: "generate" },
      steps: [
        { name: "review_scope", state: "SUCCEEDED", progress: 100 },
        { name: "extract_clauses", state: "SUCCEEDED", progress: 100 },
        { name: "risk_scan", state: "SUCCEEDED", progress: 100 },
        { name: "missing_terms", state: "SUCCEEDED", progress: 100 },
        { name: "generate", state: "RUNNING", progress: 96 },
      ],
    });
    const timer = window.setTimeout(() => {
      setLocation(`/app/cases/${caseId}/agents/contract-risk/results`, { replace: true } as any);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (cachedReplay) return;
    if (!caseId || runId) return;
    contractRiskService
      .getOverview(caseId)
      .then((meta) => {
        if (meta.latest_output_status === "running" && meta.latest_run_id) {
          setRunId(meta.latest_run_id);
        } else if (meta.latest_output_status === "done") {
          setLocation(`/app/cases/${caseId}/agents/contract-risk/results`, { replace: true } as any);
        } else if (meta.latest_output_status === "error") {
          setError("Latest contract risk run failed. Retry analysis.");
        } else {
          setError("No running analysis found for this case.");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to resolve running analysis"));
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (cachedReplay) return;
    if (!caseId || !runId) return;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const s = await contractRiskService.getRunStatus(runId);
        if (cancelled) return;
        setStatus(s);

        if (isDoneStatus(s.status) || s.done === true) {
          timer = window.setTimeout(() => {
            setLocation(`/app/cases/${caseId}/agents/contract-risk/results`, { replace: true } as any);
          }, COMPLETION_SETTLE_MS);
          return;
        }

        if (isErrorStatus(s.status)) {
          setError(s.error || s.error_message || "Analysis failed");
          return;
        }

        timer = window.setTimeout(poll, 900);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to poll analysis");
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (!status?.started_at || isDoneStatus(status?.status) || isErrorStatus(status?.status)) return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status?.started_at, status?.status]);

  if (!caseId) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <LoadingState title="Loading run" description="Resolving case context..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <ErrorState
          title="Contract risk analysis failed"
          description={error}
          actionLabel="Back to Start"
          onAction={() => setLocation(`/app/cases/${caseId}/agents/contract-risk`)}
        />
      </div>
    );
  }

  if (!runId) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <LoadingState title="Preparing analysis" description="Resolving current run..." />
      </div>
    );
  }

  const steps = status?.steps || [];
  const stats = status?.stats || status?.progress?.stats || { clausesFound: 0, risksDetected: 0, missingClauses: 0 };
  const progressSteps = [
    { key: "review_scope", label: "Parsing contract scope..." },
    { key: "extract_clauses", label: "Identifying key clauses..." },
    { key: "risk_scan", label: "Searching risk signals..." },
    { key: "missing_terms", label: "Analyzing missing clauses..." },
    { key: "generate", label: "Generating contract review..." },
  ];
  const current = String(status?.progress?.step || status?.stage || "extract_clauses").toLowerCase();
  const rawOverallPct =
    typeof status?.progress?.pct === "number"
      ? status.progress.pct
      : typeof status?.stepIndex === "number" && typeof status?.stepsTotal === "number" && status.stepsTotal > 0
        ? ((Math.max(1, Number(status.stepIndex)) / Number(status.stepsTotal)) * 100)
        : undefined;
  const startedAtMs = status?.started_at ? Date.parse(String(status.started_at)) : NaN;
  const stepRows = buildAnalyzingStepRows(progressSteps, current, Array.isArray(steps) ? steps : [], {
    stepIndex: typeof status?.stepIndex === "number" ? status.stepIndex : undefined,
    overallPct: rawOverallPct,
  });
  const progressPct = computeAnimatedAnalyzingProgressPct({
    stepRows,
    overallPct: isDoneStatus(status?.status) || status?.done === true ? 100 : rawOverallPct,
    startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : undefined,
    nowMs: nowTs,
  });

  return (
    <AgentProcessingScreen
      runType="single_agent"
      eyebrow="Contract Risk Review"
      title="AI is reviewing your contract"
      subtitle="The engine is extracting clauses, checking missing protections, and scoring contractual risk before the final report is produced."
      statusLabel="Contract analysis in progress"
      statusDetail={String(status?.progress?.step || status?.stage || "Reviewing contractual structure and risk signals.")}
      startedAtMs={Number.isFinite(startedAtMs) ? startedAtMs : undefined}
      progressPct={progressPct}
      steps={stepRows}
      metrics={[
        { label: "Clauses", value: stats.clausesFound ?? 0, hint: "identified" },
        { label: "Risks", value: stats.risksDetected ?? 0, hint: "flagged" },
        { label: "Missing", value: stats.missingClauses ?? 0, hint: "clauses" },
        { label: "Run", value: runId.slice(0, 8), hint: "tracking id" },
      ]}
      metaItems={[
        { label: "Workflow", value: "Contract risk + dispute review" },
        { label: "Source scope", value: "Current case workspace" },
      ]}
      footerNote="Clause extraction, risk scanning, and missing-term validation are processed before recommendations are generated."
      action={<Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/contract-risk`)}>Back</Button>}
    />
  );
}

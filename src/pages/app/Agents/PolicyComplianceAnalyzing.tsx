import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { policyComplianceService } from "@/services/policyComplianceService";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/app/PageState";
import AgentProcessingScreen from "@/components/app/AgentProcessingScreen";
import { buildAnalyzingStepRows, computeAnimatedAnalyzingProgressPct } from "./analyzingProgress";

const COMPLETION_SETTLE_MS = 900;

function readRunId() {
  const u = new URL(window.location.href);
  return u.searchParams.get("runId");
}

export default function PolicyComplianceAnalyzing() {
  const [matched, params] = useRoute("/app/cases/:caseId/agents/policy-compliance/analyzing");
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

  useEffect(() => {
    if (!caseId || runId || !cachedReplay) return;
    setStatus({
      status: "RUNNING",
      progress: { step: "generate" },
      steps: [
        { name: "parse_requirements", state: "SUCCEEDED", progress: 100 },
        { name: "identify_framework", state: "SUCCEEDED", progress: 100 },
        { name: "search_rules", state: "SUCCEEDED", progress: 100 },
        { name: "evaluate_risk", state: "SUCCEEDED", progress: 100 },
        { name: "generate", state: "RUNNING", progress: 96 },
      ],
    });
    const timer = window.setTimeout(() => {
      setLocation(`/app/cases/${caseId}/agents/policy-compliance/results`, { replace: true } as any);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (cachedReplay) return;
    if (!caseId || runId) return;
    policyComplianceService
      .getMeta(caseId)
      .then((meta) => {
        if (meta.latest.status === "running" && meta.latest.run_id) setRunId(meta.latest.run_id);
        else if (meta.latest.status === "done") setLocation(`/app/cases/${caseId}/agents/policy-compliance/results`, { replace: true } as any);
        else setError("No running compliance check found.");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to resolve current run"));
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (cachedReplay) return;
    if (!caseId || !runId) return;
    let cancelled = false;
    let timer: number | null = null;
    const poll = async () => {
      try {
        const s = await policyComplianceService.getRunStatus(runId);
        if (cancelled) return;
        setStatus(s);
        if (s.status === "SUCCEEDED") {
          timer = window.setTimeout(() => {
            setLocation(`/app/cases/${caseId}/agents/policy-compliance/results`, { replace: true } as any);
          }, COMPLETION_SETTLE_MS);
          return;
        }
        if (s.status === "FAILED") {
          setError(s.error || "Compliance check failed");
          return;
        }
        timer = window.setTimeout(poll, 900);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to poll run status");
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (!status?.started_at || status?.status === "SUCCEEDED" || status?.status === "FAILED") return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status?.started_at, status?.status]);

  if (!caseId) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title="Loading compliance run" description="Resolving case..." /></div>;
  if (error) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><ErrorState title="Compliance check failed" description={error} actionLabel="Back to Start" onAction={() => setLocation(`/app/cases/${caseId}/agents/policy-compliance`)} /></div>;
  if (!runId) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title="Preparing compliance check" description="Resolving current run..." /></div>;

  const progressSteps = [
    { key: "parse_requirements", label: "Parsing compliance intent..." },
    { key: "identify_framework", label: "Identifying legal framework..." },
    { key: "search_rules", label: "Searching policy and legal rules..." },
    { key: "evaluate_risk", label: "Analyzing compliance risk..." },
    { key: "generate", label: "Generating compliance report..." },
  ];
  const current = String(status?.progress?.step || status?.stage || "identify_framework").toLowerCase();
  const backendSteps = Array.isArray(status?.steps) ? status.steps : [];
  const rawOverallPct =
    typeof status?.progress?.pct === "number"
      ? status.progress.pct
      : undefined;
  const startedAtMs = status?.started_at ? Date.parse(String(status.started_at)) : NaN;
  const stepRows = buildAnalyzingStepRows(progressSteps, current, backendSteps, {
    overallPct: rawOverallPct,
  });
  const progressPct = computeAnimatedAnalyzingProgressPct({
    stepRows,
    overallPct: status?.status === "SUCCEEDED" ? 100 : rawOverallPct,
    startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : undefined,
    nowMs: nowTs,
  });

  return (
    <AgentProcessingScreen
      runType="single_agent"
      eyebrow="Policy Compliance"
      title="AI is checking your compliance"
      subtitle="The engine is mapping the case to regulatory requirements, scanning policy signals, and preparing a compliance risk view."
      statusLabel="Compliance review in progress"
      statusDetail={String(status?.progress?.step || status?.stage || "Evaluating legal and policy compliance risk.")}
      startedAtMs={Number.isFinite(startedAtMs) ? startedAtMs : undefined}
      progressPct={progressPct}
      steps={stepRows}
      metrics={[
        { label: "Framework", value: progressSteps.length, hint: "stages mapped" },
        { label: "Run", value: runId.slice(0, 8), hint: "tracking id" },
      ]}
      metaItems={[
        { label: "Scope", value: "Policy, regulatory, and legal checks" },
        { label: "Source scope", value: "Current case workspace" },
      ]}
      footerNote="Applicable frameworks, rule checks, and risk generation are processed before the final compliance report is emitted."
      action={<Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/policy-compliance`)}>Back</Button>}
    />
  );
}

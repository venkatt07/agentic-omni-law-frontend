import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AgentProcessingScreen from "@/components/app/AgentProcessingScreen";
import type { RunLogLine } from "@/components/app/run-console/useRunState";
import { caseOutcomeService } from "@/services/caseOutcomeService";
import { mergeRuntimeActivityLines, readRuntimeActivity, saveRuntimeActivity } from "@/lib/runtimeActivityStore";
import { buildAnalyzingStepRows, computeAnimatedAnalyzingProgressPct } from "./analyzingProgress";

const STEPS = [
  { key: "analyze_facts", label: "Analyzing case facts..." },
  { key: "search_similar_cases", label: "Searching similar cases..." },
  { key: "evaluate_precedents", label: "Evaluating precedents..." },
  { key: "calculate_distribution", label: "Calculating distribution..." },
  { key: "generate_report", label: "Generating outcome report..." },
];
const COMPLETION_SETTLE_MS = 900;

export default function CaseOutcomeAnalyzing() {
  const [match, params] = useRoute("/app/cases/:caseId/agents/case-outcome/analyzing");
  const [, setLocation] = useLocation();
  const caseId = match ? params.caseId : "";
  const qs = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    [],
  );
  const cachedReplay = qs.get("cached") === "1";
  const initialRunId = qs.get("runId") || "";
  const [runId, setRunId] = useState(initialRunId);
  const [step, setStep] = useState("Analyzing Case...");
  const [runStatus, setRunStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [retrying, setRetrying] = useState(false);
  const [runStartedAtMs, setRunStartedAtMs] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const isDoneStatus = (value?: string | null) =>
    ["SUCCEEDED", "DONE", "SUCCESS"].includes(String(value || "").toUpperCase());
  const isErrorStatus = (value?: string | null) =>
    ["FAILED", "ERROR", "CANCELLED", "ABORTED"].includes(String(value || "").toUpperCase());
  const isTransientFetchError = (e: unknown) =>
    e instanceof Error && /failed to fetch|networkerror|load failed|fetch failed/i.test(String(e.message || ""));

  useEffect(() => {
    if (!caseId || runId || !cachedReplay) return;
    setRunStatus({
      status: "RUNNING",
      progress: { step: "generate_report" },
      steps: [
        { name: "analyze_facts", state: "SUCCEEDED", progress: 100 },
        { name: "search_similar_cases", state: "SUCCEEDED", progress: 100 },
        { name: "evaluate_precedents", state: "SUCCEEDED", progress: 100 },
        { name: "calculate_distribution", state: "SUCCEEDED", progress: 100 },
        { name: "generate_report", state: "RUNNING", progress: 96 },
      ],
    });
    setStep("generate_report");
    const timer = window.setTimeout(() => {
      setLocation(`/app/cases/${caseId}/agents/case-outcome/results`, { replace: true } as any);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (cachedReplay) return;
    if (!caseId) return;
    let cancelled = false;

    const loop = async () => {
      try {
        if (!runId) {
          const meta = await caseOutcomeService.getMeta(caseId);
          if (cancelled) return;

          if (meta.latest?.run_id && meta.latest.status === "running") {
            setRunId(meta.latest.run_id);
          } else if (meta.latest?.status === "done") {
            setLocation(`/app/cases/${caseId}/agents/case-outcome/results`, { replace: true } as any);
          } else if (meta.latest?.status === "error") {
            throw new Error(meta.latest?.failure_reason || "Latest analysis failed");
          } else {
            throw new Error("No running analysis found.");
          }
          return;
        }

        let transientFetchErrors = 0;
        for (let i = 0; i < 1200; i += 1) {
          let status: any = null;
          try {
            status = await caseOutcomeService.getRunStatus(runId);
          } catch (e) {
            if (isTransientFetchError(e)) {
              transientFetchErrors += 1;
              if (transientFetchErrors >= 20) {
                setError("Connection lost while tracking analysis. Please ensure backend is running, then retry.");
                return;
              }
              setStep("Reconnecting to backend...");
              await new Promise((r) => setTimeout(r, 700));
              continue;
            }
            throw e;
          }
          if (cancelled) return;
          transientFetchErrors = 0;
          setRunStatus(status);
          if (status?.started_at) {
            const parsedStartedAt = Date.parse(String(status.started_at));
            if (Number.isFinite(parsedStartedAt)) {
              setRunStartedAtMs(parsedStartedAt);
            }
          }

          setStep(String(status.progress?.step || status.stage || "Analyzing Case..."));
          setStats(status.progress?.stats || status.stats || {});

          if (isErrorStatus(status.status)) {
            setError(status.error_message || status.error || "Analysis failed");
            return;
          }

          if (isDoneStatus(status.status) || (status.done === true && !status.error && !status.error_message)) {
            await new Promise((resolve) => window.setTimeout(resolve, COMPLETION_SETTLE_MS));
            if (cancelled) return;
            setLocation(`/app/cases/${caseId}/agents/case-outcome/results`, { replace: true } as any);
            return;
          }

          await new Promise((r) => setTimeout(r, 450));
        }

        setError("Analysis timed out. Retry.");
      } catch (e) {
        if (!cancelled) {
          if (isTransientFetchError(e)) {
            setError("Connection issue while starting/tracking analysis. Check backend and retry.");
          } else {
            setError(e instanceof Error ? e.message : "Could not track analysis");
          }
        }
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [cachedReplay, caseId, runId, setLocation]);

  useEffect(() => {
    if (!runStartedAtMs || isDoneStatus(runStatus?.status) || isErrorStatus(runStatus?.status)) return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [runStartedAtMs, runStatus?.status]);

  const backendSteps = Array.isArray(runStatus?.steps) ? runStatus.steps : [];
  const rawOverallPct =
    typeof runStatus?.progress?.pct === "number"
      ? runStatus.progress.pct
      : undefined;
  const stepRows = buildAnalyzingStepRows(STEPS, step, backendSteps, {
    overallPct: rawOverallPct,
  });
  const queryHistoryLines = useMemo(
    () => readRuntimeActivity(caseId, "query_parsing")?.lines || [],
    [caseId],
  );
  const persistedOutcomeLines = useMemo(
    () => (runId ? readRuntimeActivity(caseId, "case_outcome", runId)?.lines || [] : []),
    [caseId, runId],
  );
  const handoffLines = useMemo<RunLogLine[]>(
    () =>
      queryHistoryLines.length
        ? [
            {
              id: `handoff:query_parsing:case_outcome:${caseId}`,
              actor: "System",
              phase: "Planning",
              text: "Handing the parsed case context to Case Outcome Prediction",
              detail:
                "The outcome agent is continuing from Query Parsing without resetting the visible activity history.",
              next: "Analyze facts, compare similar matters, and estimate the outcome range.",
              tone: "neutral",
              state: "completed",
            },
          ]
        : [],
    [caseId, queryHistoryLines.length],
  );
  const activityHistoryLines = useMemo(
    () => mergeRuntimeActivityLines(queryHistoryLines, handoffLines, persistedOutcomeLines),
    [handoffLines, persistedOutcomeLines, queryHistoryLines],
  );
  const progressPct = computeAnimatedAnalyzingProgressPct({
    stepRows,
    overallPct: isDoneStatus(runStatus?.status) || runStatus?.done === true ? 100 : rawOverallPct,
    startedAtMs: runStartedAtMs ?? undefined,
    nowMs: nowTs,
  });

  return error ? (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="space-y-4">
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 text-sm">
          <div className="font-medium">
            {/connection|fetch|backend/i.test(String(error || ""))
              ? "Connection issue while tracking analysis. Retry."
              : "Analysis incomplete (model aborted). Retry."}
          </div>
          <div className="text-muted-foreground mt-1">{error}</div>
        </Card>
        <div className="flex gap-2">
          <Button onClick={() => setLocation(`/app/cases/${caseId}/agents/case-outcome`)}>Back to Form</Button>
          <Button
            variant="outline"
            onClick={async () => {
              setRetrying(true);
              try {
                const started = await caseOutcomeService.startRun(caseId, { force: true });
                if (started.run_id) {
                  setError(null);
                  setRunId(started.run_id);
                } else {
                  setError("Could not start retry run.");
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : "Retry failed");
              } finally {
                setRetrying(false);
              }
            }}
            disabled={retrying}
          >
            {retrying ? "Retrying..." : "Retry"}
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <AgentProcessingScreen
      runType="single_agent"
      eyebrow="Case Outcome Prediction"
      title="AI is analyzing your case"
      subtitle="The model is comparing factual patterns, retrieving similar matters, and estimating outcome distribution before the report is produced."
      statusLabel="Outcome analysis in progress"
      statusDetail={step}
      startedAtMs={runStartedAtMs ?? undefined}
      progressPct={progressPct}
      steps={stepRows}
      activityHistoryLines={activityHistoryLines}
      onActivityLinesChange={(lines) => {
        if (!caseId || !runId || !lines.length) return;
        saveRuntimeActivity({
          caseId,
          stage: "case_outcome",
          runId,
          lines,
        });
      }}
      metrics={[
        ...(Object.keys(stats).length
          ? Object.entries(stats).slice(0, 4).map(([k, v]) => ({
              label: String(k).replaceAll("_", " "),
              value: String(v),
            }))
          : [
              { label: "Similar cases", value: "0" },
              { label: "Precedents", value: "0" },
            ]),
        { label: "Run", value: runId.slice(0, 8), hint: "tracking id" },
      ].slice(0, 4)}
      metaItems={[
        { label: "Workflow", value: "Prediction + distribution analysis" },
        { label: "Source scope", value: "Current case workspace" },
      ]}
      footerNote="Fact analysis, precedent comparison, and distribution modeling are completed before the outcome report is returned."
      action={
        <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/case-outcome`)}>
          Back
        </Button>
      }
    />
  );
}

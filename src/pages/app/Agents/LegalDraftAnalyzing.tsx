import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { legalDraftsService } from "@/services/legalDraftsService";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/app/PageState";
import AgentProcessingScreen from "@/components/app/AgentProcessingScreen";
import { buildAnalyzingStepRows, computeAnimatedAnalyzingProgressPct } from "./analyzingProgress";

const COMPLETION_SETTLE_MS = 900;
const DRAFT_RECOVERY_CHECK_MS = 25_000;
const PRELOADER_ESCAPE_MS = 12_000;

function readParams() {
  const u = new URL(window.location.href);
  return { runId: u.searchParams.get("runId"), draftId: u.searchParams.get("draftId") };
}

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

export default function LegalDraftAnalyzing() {
  const [matched, params] = useRoute("/app/cases/:caseId/agents/legal-drafts/:templateKey/analyzing");
  const [, setLocation] = useLocation();
  const caseId = matched ? params.caseId : undefined;
  const templateKey = matched ? params.templateKey : undefined;
  const initial = readParams();
  const [runId] = useState<string | null>(initial.runId);
  const [draftId] = useState<string | null>(initial.draftId);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!caseId || !templateKey || !runId || !draftId) {
      setError("Missing run context for draft generation.");
      return;
    }
    let cancelled = false;
    let timer: number | null = null;
    let escapeTimer: number | null = null;
    let transientErrors = 0;
    const isTransient = (msg: string) => /failed to fetch|networkerror|load failed/i.test(msg);
    const editorHref = `/app/cases/${caseId}/agents/legal-drafts/${templateKey}/${draftId}${runId ? `?runId=${encodeURIComponent(runId)}` : ""}`;
    const navigateToDraft = () => {
      setLocation(editorHref, { replace: true } as any);
    };
    const tryOpenDraft = async () => {
      try {
        const draft = await legalDraftsService.getDraft(caseId, draftId);
        if (cancelled) return false;
        if (draft && String(draft.status || "").toLowerCase() !== "running") {
          navigateToDraft();
          return true;
        }
      } catch {
        // Keep polling the run when the draft row is not ready yet.
      }
      return false;
    };
    escapeTimer = window.setTimeout(() => {
      if (cancelled) return;
      void tryOpenDraft().then((opened) => {
        if (!opened && !cancelled) navigateToDraft();
      });
    }, PRELOADER_ESCAPE_MS);

    const poll = async () => {
      try {
        const s = await legalDraftsService.getRunStatus(runId);
        if (cancelled) return;
        transientErrors = 0;
        setStatus(s);
        if (s.status === "SUCCEEDED") {
          const opened = await tryOpenDraft();
          if (cancelled || opened) return;
          timer = window.setTimeout(() => {
            void tryOpenDraft().then((ready) => {
              if (!ready && !cancelled) navigateToDraft();
            });
          }, COMPLETION_SETTLE_MS);
          return;
        }
        if (s.status === "FAILED") {
          const opened = await tryOpenDraft();
          if (cancelled || opened) return;
          setError(s.error_message || s.error || "Draft generation failed");
          return;
        }
        const startedAtMs = s?.started_at ? Date.parse(String(s.started_at)) : NaN;
        if (Number.isFinite(startedAtMs) && (Date.now() - startedAtMs) >= DRAFT_RECOVERY_CHECK_MS) {
          const opened = await tryOpenDraft();
          if (cancelled || opened) return;
        }
        timer = window.setTimeout(poll, 900);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to poll draft generation";
        if (isTransient(msg) && transientErrors < 12) {
          transientErrors += 1;
          timer = window.setTimeout(poll, Math.min(2000, 500 + transientErrors * 150));
          return;
        }
        setError(msg);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (escapeTimer) window.clearTimeout(escapeTimer);
    };
  }, [caseId, templateKey, runId, draftId, setLocation]);

  useEffect(() => {
    if (!status?.started_at || status?.status === "SUCCEEDED" || status?.status === "FAILED") return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status?.started_at, status?.status]);

  if (!caseId || !templateKey) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><LoadingState title="Loading draft generation" description="Resolving route context..." /></div>;
  if (error) return <div className="p-6 md:p-8 max-w-6xl mx-auto"><ErrorState title="Draft generation failed" description={error} actionLabel="Back to Templates" onAction={() => setLocation(`/app/cases/${caseId}/agents/legal-drafts`)} /></div>;

  const progressSteps = [
    { key: "parse_template", label: "Parsing draft template..." },
    { key: "extract_facts", label: "Extracting case facts..." },
    { key: "retrieve_evidence", label: "Searching evidence snippets..." },
    { key: "validate", label: "Analyzing draft quality..." },
    { key: "generate", label: "Generating final draft..." },
  ];
  const current = String(status?.progress?.step || status?.stage || "extract_facts").toLowerCase();
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
  const endedAtMs = status?.updated_at ? Date.parse(String(status.updated_at)) : NaN;
  const elapsedLabel = Number.isFinite(startedAtMs)
    ? formatElapsedMs((status?.status === "SUCCEEDED" || status?.status === "FAILED") && Number.isFinite(endedAtMs) ? endedAtMs - startedAtMs : nowTs - startedAtMs)
    : "0s";

  return (
    <AgentProcessingScreen
      runType="single_agent"
      eyebrow="Legal Draft Generator"
      title="AI is generating your draft"
      subtitle="The system is fitting the template, grounding the output in case facts and evidence, then validating the final draft before delivery."
      statusLabel="Draft assembly in progress"
      statusDetail={String(status?.progress?.step || status?.stage || "Preparing draft output and validation checks.")}
      startedAtMs={Number.isFinite(startedAtMs) ? startedAtMs : undefined}
      progressPct={progressPct}
      steps={stepRows}
      metrics={[
        { label: "Template", value: String(templateKey).replaceAll("-", " "), hint: "selected" },
        { label: "Run", value: String(runId || "").slice(0, 8), hint: "tracking id" },
        { label: "Elapsed", value: elapsedLabel, hint: "agent runtime" },
      ]}
      metaItems={[
        { label: "Draft source", value: "Case workspace + template" },
        { label: "Validation", value: "Evidence-grounded checks" },
      ]}
      footerNote="Template parsing, fact extraction, evidence retrieval, and draft validation are completed before the document is published."
      action={<Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/agents/legal-drafts`)}>Back</Button>}
    />
  );
}

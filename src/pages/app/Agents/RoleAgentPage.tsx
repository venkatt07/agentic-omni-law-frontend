import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { RoleAgentPageShell, type RoleAgentState } from "@/components/agents/RoleAgentPageShell";
import { getRoleAgentsForRole, roleAgentRegistry, type RoleAgentKey } from "@/agents/roleAgentRegistry";
import { useAppStore } from "@/store";
import { roleAgentsService } from "@/services/roleAgentsService";
import { caseService } from "@/services/caseService";
import { runService } from "@/services/runService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canOpenSourceDocument, getSourceActionLabel, getSourceDescriptorLabel, getSourceDisplayName, getSourceHintLabel } from "@/lib/sourceDocument";
import { openAgentCase } from "@/lib/agentCaseNavigation";

type CaseRow = { case_id: string; title: string; updated_at: string };

function parseCaseAndAgent(path: string) {
  const m = path.match(/^\/app\/cases\/([^/]+)\/agents\/role\/([^/?#]+)/i);
  if (m) return { caseId: decodeURIComponent(m[1]), agentKey: decodeURIComponent(m[2]) };
  const m2 = path.match(/^\/app\/agents\/role\/([^/?#]+)/i);
  if (m2) return { caseId: null, agentKey: decodeURIComponent(m2[1]) };
  return { caseId: null, agentKey: "" };
}

export default function RoleAgentPage() {
  const [location, setLocation] = useLocation();
  const selectedRole = useAppStore((s) => s.selectedRole);
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);
  const parsed = parseCaseAndAgent(location);
  const [agentMeta, setAgentMeta] = useState<any>(null);
  const [output, setOutput] = useState<any>(null);
  const [state, setState] = useState<RoleAgentState>("empty");
  const [isHydrating, setIsHydrating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [cases, setCases] = useState<CaseRow[]>([]);

  const currentAgent = useMemo(() => roleAgentRegistry[parsed.agentKey as RoleAgentKey], [parsed.agentKey]);
  const openSavedReport = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("view") === "report";
  }, [location]);
  const returnTo = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("returnTo") || "";
  }, [location]);
  const hideHistory = Boolean(returnTo);
  const backHref = returnTo || (parsed.caseId ? `/app/cases/${parsed.caseId}/agents/query-parsing` : "/app/agents/query");
  const backLabel = returnTo ? "Back to Automated Report" : "Back to Query Parsing";
  const deriveState = (out: any): RoleAgentState => {
    if (!out) return "empty";
    if (String(out?.stage || out?.status || "").toLowerCase() === "running") return "running";
    if (Array.isArray(out?.sections) && out.sections.length > 0) return "done";
    if (typeof out?.analysis_valid === "boolean") return "done";
    if (Array.isArray(out?.citations) && out.citations.length > 0) return "done";
    if (typeof out?.failure_reason === "string" && out.failure_reason.trim()) return "done";
    return "error";
  };
  const buildRunningOutput = (status: any) => ({
    status: status?.status,
    stage: status?.stage,
    stepIndex: typeof status?.stepIndex === "number" ? status.stepIndex : undefined,
    stepsTotal: typeof status?.stepsTotal === "number" ? status.stepsTotal : undefined,
    progress: status?.progress || { step: status?.stage },
    steps: Array.isArray(status?.steps) ? status.steps : [],
    error: status?.error || null,
    error_message: status?.error_message || null,
    started_at: status?.started_at,
    updated_at: status?.updated_at,
    meta: status?.meta,
  });

  const fetchLatestRolePayload = async (caseId: string, agentKey: string) => {
    let lastPayload: any = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        lastPayload = await roleAgentsService.getOutput(caseId, agentKey);
        if (lastPayload) return lastPayload;
      } catch {
        // retry through meta below
      }
      try {
        const meta: any = await roleAgentsService.getMeta(caseId, agentKey);
        const fallbackPayload = meta?.latest?.output || null;
        if (fallbackPayload && String(fallbackPayload?.stage || "").toLowerCase() !== "running") {
          lastPayload = fallbackPayload;
          return fallbackPayload;
        }
      } catch {
        // keep retrying
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
    return lastPayload;
  };

  useEffect(() => {
    if (!currentAgent) return;
    if (!parsed.caseId && activeCaseId) {
      setLocation(`/app/cases/${activeCaseId}/agents/role/${currentAgent.agent_key}`);
    }
  }, [currentAgent, selectedRole, parsed.caseId, activeCaseId, setLocation]);

  useEffect(() => {
    if (!parsed.caseId || !currentAgent) return;
    let dead = false;
    setIsHydrating(true);
    setState("empty");
    setOutput(null);
    setRunId(null);
    roleAgentsService.getMeta(parsed.caseId, currentAgent.agent_key)
      .then(async (meta: any) => {
        if (dead) return;
        setAgentMeta(meta);
        if (meta?.latest?.run_id) setRunId(meta.latest.run_id);

        if (openSavedReport) {
          if (meta?.latest?.output && String(meta?.latest?.output?.stage || "").toLowerCase() !== "running") {
            setOutput(meta.latest.output);
            setState(deriveState(meta.latest.output));
            setIsHydrating(false);
            return;
          }
          try {
            const latestOutput = await fetchLatestRolePayload(parsed.caseId!, currentAgent.agent_key);
            if (dead) return;
            if (latestOutput) {
              setOutput(latestOutput);
              setState(deriveState(latestOutput));
              setIsHydrating(false);
              return;
            }
          } catch {
            if (dead) return;
          }
          if (meta?.latest?.status === "running" && meta.latest.run_id) {
            setRunId(meta.latest.run_id);
            setOutput({
              status: "RUNNING",
              progress: meta.latest.progress || {},
              steps: Array.isArray(meta.latest.steps) ? meta.latest.steps : [],
            });
            setState("running");
            setIsHydrating(false);
            return;
          }
          if (meta?.latest?.status === "error") {
            const fallbackOutput =
              meta?.latest?.output ||
              { analysis_valid: false, failure_reason: meta?.latest?.failure_reason || "Latest report is unavailable for this case." };
            setOutput(fallbackOutput);
            setState(deriveState(fallbackOutput));
            setIsHydrating(false);
            return;
          }
          if (meta?.latest?.status && meta.latest.status !== "none") {
            const fallbackOutput =
              meta?.latest?.output ||
              {
                analysis_valid: false,
                failure_reason:
                  meta?.latest?.failure_reason ||
                  "The latest agent run completed, but its saved report could not be loaded. Please retry this agent once.",
              };
            setOutput(fallbackOutput);
            setState(deriveState(fallbackOutput));
            setIsHydrating(false);
            return;
          }
          setState("empty");
          setIsHydrating(false);
          return;
        }

        if (meta?.latest?.output && String(meta?.latest?.output?.stage || "").toLowerCase() !== "running") {
          setOutput(meta.latest.output);
          setState(deriveState(meta.latest.output));
          setIsHydrating(false);
          return;
        }

        if (meta?.latest?.status === "running" && meta.latest.run_id) {
          setRunId(meta.latest.run_id);
          setOutput({
            status: "RUNNING",
            progress: meta.latest.progress || {},
            steps: Array.isArray(meta.latest.steps) ? meta.latest.steps : [],
          });
          setState("running");
        } else {
          setState("empty");
        }
        setIsHydrating(false);
      })
      .catch((e) => {
        if (dead) return;
        setOutput({ failure_reason: e?.message || "Failed to load role agent" });
        setState("error");
        setIsHydrating(false);
      });
    return () => { dead = true; };
  }, [openSavedReport, parsed.caseId, currentAgent]);

  useEffect(() => {
    if (state !== "running" || !runId || !parsed.caseId || !currentAgent) return;
    let cancelled = false;

    const poll = async () => {
      try {
        while (!cancelled) {
          const status = await runService.getStatus(runId);
          if (cancelled) return;

          setOutput(buildRunningOutput(status));

          if (status.status === "SUCCEEDED") {
            const out: any = await fetchLatestRolePayload(parsed.caseId!, currentAgent.agent_key);
            if (cancelled) return;
            if (out) {
              setOutput(out);
              setState(deriveState(out));
              return;
            }
            try {
              const meta: any = await roleAgentsService.getMeta(parsed.caseId!, currentAgent.agent_key);
              if (cancelled) return;
              const fallbackOutput =
                meta?.latest?.output ||
                { analysis_valid: false, failure_reason: "The run completed, but the saved report is still syncing. Please retry once." };
              setOutput(fallbackOutput);
              setState(deriveState(fallbackOutput));
              return;
            } catch {
              setOutput({ analysis_valid: false, failure_reason: "The run completed, but the saved report is still syncing. Please retry once." });
              setState("error");
              return;
            }
          }

          if (status.status === "FAILED") {
            const out = await fetchLatestRolePayload(parsed.caseId!, currentAgent.agent_key)
              .catch(() => null);
            if (cancelled) return;
            let finalOut = out;
            if (!finalOut) {
              try {
                const meta: any = await roleAgentsService.getMeta(parsed.caseId!, currentAgent.agent_key);
                if (cancelled) return;
                finalOut = meta?.latest?.output || null;
              } catch {
                // ignore
              }
            }
            finalOut = finalOut || { analysis_valid: false, failure_reason: status.error_message || status.error || "Run failed" };
            setOutput(finalOut);
            const next = deriveState(finalOut);
            setState(next === "done" ? "done" : "error");
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        if (cancelled) return;
        setOutput({ failure_reason: error?.message || "Failed to poll role agent run" });
        setState("error");
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [state, runId, parsed.caseId, currentAgent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("role-agent-run-guard", { detail: { active: state === "running", runId, caseId: parsed.caseId, agentKey: currentAgent?.agent_key || null } }));
    return () => {
      window.dispatchEvent(new CustomEvent("role-agent-run-guard", { detail: { active: false } }));
    };
  }, [state, runId, parsed.caseId, currentAgent]);

  const startRun = async (force = false) => {
    if (!parsed.caseId || !currentAgent) return;
    try {
      setState("running");
      const started: any = await roleAgentsService.startRun(parsed.caseId, currentAgent.agent_key, { force });
      if (started?.status === "cached" && started.output) {
        const syntheticSteps = currentAgent.preloader_steps.map((step, index) => ({
          name: step,
          state: index < currentAgent.preloader_steps.length - 1 ? "SUCCEEDED" : "RUNNING",
          progress: Math.round(((index + 1) / Math.max(currentAgent.preloader_steps.length, 1)) * 100),
          message:
            index < currentAgent.preloader_steps.length - 1
              ? "Stage completed from the current case workspace."
              : "Finalizing the cached role-agent output for this workspace.",
        }));
        setOutput({
          progress: { step: currentAgent.preloader_steps.at(-1) || currentAgent.preloader_steps[0] || "Preparing analysis" },
          steps: syntheticSteps,
        });
        window.setTimeout(() => {
          setOutput(started.output);
          setState(deriveState(started.output));
        }, 900);
        return;
      }
      const rid = String(started?.run_id || "");
      setRunId(rid);
      setOutput({
        progress: { step: currentAgent.preloader_steps[0] || "Preparing analysis" },
        steps: currentAgent.preloader_steps.map((step, index) => ({
          name: step,
          state: index === 0 ? "RUNNING" : "PENDING",
          progress: index === 0 ? 8 : 0,
        })),
      });
    } catch (error: any) {
      setOutput({ failure_reason: error?.message || "Failed to start role agent run" });
      setState("error");
    }
  };

  const openCasePicker = async () => {
    try {
      const list = await caseService.listCases();
      setCases((list || []) as any);
      setCasePickerOpen(true);
    } catch (error: any) {
      setOutput({ failure_reason: error?.message || "Failed to load cases" });
      setState("error");
    }
  };

  if (!currentAgent) return null;

  const caseTitle = agentMeta?.case?.title || "Case Workspace";
  const docName = getSourceDisplayName(agentMeta?.primary_doc, "Case input");
  const sourceLabel = getSourceHintLabel(agentMeta?.primary_doc);
  const sourceActionLabel = getSourceActionLabel(agentMeta?.primary_doc);
  const sourceDescriptorLabel = getSourceDescriptorLabel(agentMeta?.primary_doc);
  const canOpenSource = canOpenSourceDocument(agentMeta?.primary_doc);

  return (
    <>
      <RoleAgentPageShell
        agentKey={currentAgent.agent_key}
        title={currentAgent.title}
        roleBadge={selectedRole || "Role"}
        caseTitle={caseTitle}
        sourceLabel={sourceLabel}
        docLabel={docName}
        sourceDescriptorLabel={sourceDescriptorLabel}
        sourceActionLabel={sourceActionLabel}
        canOpenSource={canOpenSource}
        docPages={agentMeta?.primary_doc?.pages ?? agentMeta?.latest?.output?.meta?.primary_doc?.pages ?? null}
        state={state}
        preloaderSteps={agentMeta?.preloader_steps || currentAgent.preloader_steps}
        latestRunLabel={runId}
        recentRuns={Array.isArray(agentMeta?.recent_runs) ? agentMeta.recent_runs : []}
        hideRecentRuns={hideHistory}
        hideRunMeta={hideHistory}
        isHydrating={isHydrating}
        output={output}
        supportsExportPdf={Boolean(agentMeta?.supports_export_pdf && currentAgent.supports_export_pdf)}
        exportUrl={parsed.caseId ? roleAgentsService.getExportUrl(parsed.caseId, currentAgent.agent_key) : null}
        onRun={() => startRun(true)}
        onRetry={() => startRun(true)}
        onBack={() => setLocation(backHref)}
        backLabel={backLabel}
        onViewDoc={() => {
          const docId = agentMeta?.primary_doc?.doc_id;
          if (parsed.caseId && docId) setLocation(`/app/cases/${parsed.caseId}/documents/${docId}`);
        }}
        onSwitchCase={openCasePicker}
        onOpenRecentRun={(run) => {
          const targetCaseId = String(run.case_id || "").trim();
          if (!targetCaseId) return;
          void openAgentCase({
            agentKey: currentAgent.agent_key,
            caseId: targetCaseId,
            title: run.case_title || "Case Workspace",
            setLocation,
          });
        }}
      />

      <Dialog open={casePickerOpen} onOpenChange={setCasePickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {cases.map((row) => (
              <button
                key={row.case_id}
                type="button"
                className="w-full text-left rounded-md border p-3 hover:border-primary transition-colors"
                onClick={() => {
                  setCasePickerOpen(false);
                  void openAgentCase({
                    agentKey: currentAgent.agent_key,
                    caseId: row.case_id,
                    title: row.title,
                    setLocation,
                  });
                }}
              >
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.case_id}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

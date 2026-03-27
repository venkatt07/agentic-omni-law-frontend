import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  PlayCircle,
  Workflow,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/app/PageState";
import { useAppStore } from "@/store";
import { caseService, type CaseSummaryResponse } from "@/services/caseService";
import { authService } from "@/services/authService";
import { setLoadingIntent } from "@/lib/loadingIntent";
import { useToast } from "@/hooks/use-toast";

const ORCHESTRATOR_RUN_DRAFT_PREFIX = "dashboard_run_loading_draft:";

type UiMode = "loading" | "ready" | "error";

function mapRunState(status: string | null | undefined): "running" | "error" | "done" | "idle" {
  const value = String(status || "").toLowerCase();
  if (value === "running" || value === "queued" || value === "pending") return "running";
  if (value === "failed" || value === "error") return "error";
  if (value === "succeeded" || value === "done" || value === "completed" || value === "success") return "done";
  return "idle";
}

export default function Orchestrator() {
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const casesById = useAppStore((state) => state.casesById);
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<UiMode>("loading");
  const [cases, setCases] = useState<CaseSummaryResponse[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [runPrompt, setRunPrompt] = useState("");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setMode("loading");
      try {
        const rows = await caseService.listCases();
        const sorted = [...rows].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
        if (!mounted) return;
        setCases(sorted);
        const fallbackCaseId = activeCaseId || sorted[0]?.case_id || "";
        setSelectedCaseId((prev) => prev || fallbackCaseId);
        setMode("ready");
      } catch {
        if (!mounted) return;
        setMode("error");
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [activeCaseId]);

  const selectedCase =
    cases.find((item) => item.case_id === selectedCaseId) ||
    (activeCaseId ? cases.find((item) => item.case_id === activeCaseId) : undefined) ||
    cases[0];

  const runRows = useMemo(() => {
    return cases.slice(0, 6).map((item) => {
      const state = mapRunState(item.last_run_status);
      return {
        ...item,
        state,
        hasReport: Number(item.successful_run_count || 0) > 0,
      };
    });
  }, [cases]);

  const runSummary = useMemo(() => {
    return runRows.reduce(
      (acc, item) => {
        if (item.state === "running") acc.running += 1;
        else if (item.state === "error") acc.error += 1;
        else if (item.state === "done") acc.done += 1;
        else acc.idle += 1;
        return acc;
      },
      { running: 0, error: 0, done: 0, idle: 0 },
    );
  }, [runRows]);

  const openCaseWorkspace = async (caseId: string) => {
    const title = casesById[caseId]?.title || cases.find((item) => item.case_id === caseId)?.title || "Case Workspace";
    setCaseWorkspace(caseId, title);
    void authService.setActiveCase(caseId).catch(() => undefined);
    setLocation(`/app/cases/${encodeURIComponent(caseId)}`);
  };

  const openLatestOutput = async (caseId: string) => {
    const title = casesById[caseId]?.title || cases.find((item) => item.case_id === caseId)?.title || "Case Workspace";
    setCaseWorkspace(caseId, title);
    void authService.setActiveCase(caseId).catch(() => undefined);
    try {
      const details = await caseService.fetchCase(caseId);
      const outputs = (details as any)?.outputs || {};
      const hasOutput = Object.keys(outputs).some((key) => {
        const value = outputs[key];
        return value && typeof value === "object" && Object.keys(value).length > 0;
      });
      if (hasOutput) {
        setLocation(`/app/dashboard/analysis/result?caseId=${encodeURIComponent(caseId)}`);
        return;
      }
    } catch {
      // Fall back to workspace if details call fails.
    }
    setLocation(`/app/cases/${encodeURIComponent(caseId)}`);
  };

  const launchPipeline = async () => {
    const targetCaseId = selectedCase?.case_id || activeCaseId || "";
    const prompt = runPrompt.trim();
    if (!targetCaseId) {
      toast({ title: "Select a case", description: "Choose a case workspace before launching the pipeline.", variant: "destructive" });
      return;
    }
    if (!prompt) {
      toast({ title: "Add run brief", description: "Provide a short run brief so the orchestrator can launch safely.", variant: "destructive" });
      return;
    }
    setLaunching(true);
    try {
      const draftKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(
        `${ORCHESTRATOR_RUN_DRAFT_PREFIX}${draftKey}`,
        JSON.stringify({ query: prompt, attachedDocs: [] }),
      );
      setLoadingIntent({
        type: "run_all",
        caseId: targetCaseId,
        draftKey,
        createdAt: Date.now(),
      });
      setLocation(
        `/app/cases/${encodeURIComponent(targetCaseId)}/run?caseId=${encodeURIComponent(targetCaseId)}&draftKey=${encodeURIComponent(draftKey)}`,
      );
    } finally {
      setLaunching(false);
    }
  };

  if (mode === "loading") {
    return <LoadingState title="Loading orchestrator" description="Preparing pipeline controls and run history." />;
  }

  if (mode === "error") {
    return <ErrorState title="Orchestrator unavailable" description="Could not load case run history. Please retry." />;
  }

  return (
    <div className="space-y-6 px-4 py-2 md:px-6 xl:px-8">
      <Card className="overflow-hidden border-0 bg-[linear-gradient(125deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96)_42%,rgba(6,78,59,0.88))] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs uppercase tracking-[0.15em]">
              <Workflow className="h-3.5 w-3.5" />
              Agent Pipeline
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Orchestrator Console</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Monitor multi-agent execution, launch a controlled run, and jump to outputs without changing runtime behavior.
            </p>
          </div>
          <Button
            variant="secondary"
            className="rounded-full bg-white text-slate-900 hover:bg-white/90"
            onClick={() => selectedCase?.case_id && void openLatestOutput(selectedCase.case_id)}
            disabled={!selectedCase?.case_id}
          >
            Open latest output
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Running</div><div className="mt-2 text-3xl font-semibold">{runSummary.running}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Completed</div><div className="mt-2 text-3xl font-semibold">{runSummary.done}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Needs Review</div><div className="mt-2 text-3xl font-semibold">{runSummary.error}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Idle</div><div className="mt-2 text-3xl font-semibold">{runSummary.idle}</div></Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-5 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Launch Control</div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">Start Pipeline Run</h2>
          <p className="mt-2 text-sm text-muted-foreground">Uses the same run flow as Dashboard and sends you to the existing run console route.</p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-foreground">Case Workspace</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={selectedCase?.case_id || ""}
              onChange={(event) => setSelectedCaseId(event.target.value)}
            >
              {cases.map((item) => (
                <option key={item.case_id} value={item.case_id}>{item.title}</option>
              ))}
            </select>
            <label className="block text-sm font-medium text-foreground">Run Brief</label>
            <textarea
              value={runPrompt}
              onChange={(event) => setRunPrompt(event.target.value)}
              className="h-28 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Example: Re-run with emphasis on risk clauses and compliance gaps from uploaded documents."
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void launchPipeline()} disabled={launching || !selectedCase?.case_id}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {launching ? "Launching..." : "Launch Run"}
              </Button>
              <Button variant="outline" onClick={() => selectedCase?.case_id && void openCaseWorkspace(selectedCase.case_id)} disabled={!selectedCase?.case_id}>
                Open workspace
              </Button>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-7 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent Orchestration Runs</div>
          <div className="mt-4 space-y-3">
            {runRows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No runs found yet.</div>
            ) : runRows.map((item) => {
              const Icon = item.state === "running" ? Activity : item.state === "done" ? CheckCircle2 : item.state === "error" ? AlertTriangle : Clock3;
              const stateLabel =
                item.state === "running" ? "Running"
                : item.state === "done" ? "Completed"
                : item.state === "error" ? "Needs Review"
                : "Idle";
              return (
                <div key={item.case_id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.case_id} · {new Date(item.updated_at).toLocaleString()}</div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                      <Icon className="h-3.5 w-3.5" />
                      {stateLabel}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void openCaseWorkspace(item.case_id)}>
                      Open workspace
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void openLatestOutput(item.case_id)}>
                      {item.hasReport ? "Open result" : "Check output"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}

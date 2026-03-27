import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, Play, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AgentProcessingScreen from "@/components/app/AgentProcessingScreen";
import { apiClient } from "@/services/apiClient";
import type { RoleAgentKey } from "@/agents/roleAgentRegistry";

export type RoleAgentState = "empty" | "running" | "done" | "error";

type RoleAgentRecentRun = {
  run_id: string;
  case_id?: string;
  status: string;
  timestamp: string;
  case_title?: string;
};

export function RoleAgentPageShell(props: {
  agentKey: RoleAgentKey;
  title: string;
  roleBadge: string;
  caseTitle: string;
  sourceLabel: string;
  sourceDescriptorLabel?: string;
  sourceActionLabel?: string;
  canOpenSource?: boolean;
  docLabel: string;
  docPages?: number | null;
  state: RoleAgentState;
  preloaderSteps: string[];
  latestRunLabel?: string | null;
  recentRuns?: RoleAgentRecentRun[];
  output: any;
  supportsExportPdf: boolean;
  onRun: () => void;
  onBack: () => void;
  backLabel?: string;
  onViewDoc: () => void;
  onSwitchCase: () => void;
  onOpenRecentRun: (run: RoleAgentRecentRun) => void;
  onRetry: () => void;
  exportUrl?: string | null;
  hideRecentRuns?: boolean;
  hideRunMeta?: boolean;
  isHydrating?: boolean;
}) {
  const { toast } = useToast();
  const layoutByAgent: Record<RoleAgentKey, string[]> = {
    lawyer_strategy_action_plan: ["hero", "split", "grid", "grid", "full"],
    lawyer_client_communication: ["hero", "split", "split", "full"],
    lawyer_court_process_copilot: ["split", "split", "grid", "full"],
    lawyer_case_prep: ["hero", "grid", "grid", "split", "full"],
    lawyer_intern_guidance: ["split", "grid", "grid", "full"],
    student_workflow_case_mgmt: ["hero", "split", "full"],
    student_concept_learning_books: ["split", "split", "full"],
    student_exam_preparation: ["hero", "grid", "full"],
    corp_executive_decision_support: ["hero", "split", "split", "full"],
    corp_workflow_case_prep: ["grid", "split", "split", "full"],
    corp_court_process: ["hero", "split", "full"],
    individual_step_by_step_guidance: ["hero", "grid", "split", "full"],
    individual_family_explain: ["hero", "split", "full"],
    individual_cost_factor: ["split", "split", "grid", "full"],
  };
  const sectionVariantClasses: Record<string, string> = {
    hero: "lg:col-span-2 border-primary/30 bg-gradient-to-br from-white via-white to-primary/5",
    split: "lg:col-span-1",
    grid: "lg:col-span-1 border-slate-200/80",
    full: "lg:col-span-2",
  };
  const renderSectionContent = (content: any) => {
    if (content == null || content === "") {
      return <p className="text-sm text-muted-foreground">No content available.</p>;
    }
    if (typeof content === "string" || typeof content === "number" || typeof content === "boolean") {
      return <pre className="whitespace-pre-wrap break-words text-sm leading-6 font-inherit">{String(content)}</pre>;
    }
    if (Array.isArray(content)) {
      return (
        <ul className="space-y-2 text-sm leading-6 list-disc pl-5">
          {content.map((item, idx) => (
            <li key={idx}>
              {typeof item === "string" || typeof item === "number" || typeof item === "boolean"
                ? String(item)
                : JSON.stringify(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof content === "object") {
      const entries = Object.entries(content).filter(([, value]) => value != null && value !== "");
      return (
        <div className="space-y-2 text-sm leading-6">
          {entries.map(([key, value]) => (
            <div key={key}>
              <span className="font-medium">{String(key).replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}: </span>
              <span>{typeof value === "string" ? value : JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <pre className="whitespace-pre-wrap break-words text-sm leading-6 font-inherit">{JSON.stringify(content, null, 2)}</pre>;
  };

  const handleExportPdf = async () => {
    if (!props.exportUrl) return;
    const safeName = props.title ? props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "role-agent-report";
    try {
      await apiClient.download(props.exportUrl, { filename: `${safeName}.pdf` });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unable to download PDF.",
        variant: "destructive",
      });
    }
  };
  const citations = Array.isArray(props.output?.citations) ? props.output.citations : [];
  const sections = Array.isArray(props.output?.sections) ? props.output.sections : [];
  const layoutPattern = layoutByAgent[props.agentKey] || [];
  const hasWarning =
    props.state === "done" &&
    props.output &&
    props.output.analysis_valid === false &&
    citations.length === 0;

  const runtimeSteps = Array.isArray(props.output?.steps) ? props.output.steps : [];
  const normalizedPreloader = props.preloaderSteps.map((s) => String(s || "").toLowerCase().trim());
  const runtimeStepIndex =
    typeof props.output?.stepIndex === "number" && Number.isFinite(props.output.stepIndex)
      ? Math.max(1, Math.min(props.preloaderSteps.length, Number(props.output.stepIndex)))
      : null;
  const activeStep = (() => {
    if (props.state !== "running") return props.preloaderSteps.length - 1;
    if (runtimeStepIndex != null) {
      return Math.max(0, runtimeStepIndex - 1);
    }
    if (runtimeSteps.length > 0) {
      const runningIdx = runtimeSteps.findIndex((s: any) => String(s?.state || "").toUpperCase() === "RUNNING");
      if (runningIdx >= 0) return Math.min(runningIdx, Math.max(props.preloaderSteps.length - 1, 0));
      const doneCount = runtimeSteps.filter((s: any) => String(s?.state || "").toUpperCase() === "SUCCEEDED").length;
      if (doneCount > 0) return Math.min(doneCount - 1, Math.max(props.preloaderSteps.length - 1, 0));
    }
    const progressStep = String(props.output?.progress?.step || "").toLowerCase().trim();
    if (progressStep) {
      const exact = normalizedPreloader.findIndex((s) => s === progressStep);
      if (exact >= 0) return exact;
      const fuzzy = normalizedPreloader.findIndex((s) => progressStep.includes(s) || s.includes(progressStep));
      if (fuzzy >= 0) return fuzzy;
    }
    return 0;
  })();
  const runningSteps = props.preloaderSteps.map((step, idx) => {
    const runtime = runtimeSteps[idx];
    const runtimeState = String(runtime?.state || "").toUpperCase();
    const isDone = runtimeState === "SUCCEEDED" || (runtimeStepIndex != null ? idx < runtimeStepIndex - 1 : idx < activeStep);
    const isCurrent = runtimeState === "RUNNING" || (runtimeStepIndex != null ? idx === runtimeStepIndex - 1 : idx === activeStep);
    return {
      key: `${idx}-${step}`,
      label: step,
      state: isDone ? "SUCCEEDED" : isCurrent ? "RUNNING" : "PENDING",
      detail:
        String(runtime?.message || "").trim() ||
        (isDone
          ? "Completed successfully and added to the active reasoning chain."
          : isCurrent
            ? "This stage is actively processing your workspace context."
            : "Queued to run automatically after the current stage finishes."),
    };
  });
  const currentRuntimeStep = runningSteps[activeStep] || runningSteps[0];
  const progressPct = runningSteps.length
    ? Math.round(
        runningSteps.reduce((acc, step, idx) => {
          const runtime = runtimeSteps[idx];
          const explicitPct = Number(runtime?.progress || (idx === activeStep ? props.output?.progress?.pct : 0) || 0);
          return acc + (step.state === "SUCCEEDED" ? 100 : step.state === "RUNNING" ? Math.max(18, Math.min(99, explicitPct || 55)) : 0);
        }, 0) / runningSteps.length,
      )
    : Math.round(((activeStep + 1) / Math.max(props.preloaderSteps.length, 1)) * 100);
  const sourceDescriptorLabel = props.sourceDescriptorLabel || "Document source";
  const sourceActionLabel = props.sourceActionLabel || "View Source";
  const canOpenSource = props.canOpenSource ?? false;
  const sourceLeadLabel =
    sourceDescriptorLabel === "Input source"
      ? "Using case input from Query Parsing"
      : "Using document from Query Parsing";
  const showRunAction = props.state !== "done";

  if (props.state === "running") {
    return (
      <AgentProcessingScreen
        runType="single_agent"
        eyebrow={props.title}
        title={`${props.title} is running`}
        subtitle="The agent is reading the active case workspace, grounding against the selected source input, and preparing structured output for review."
        statusLabel={currentRuntimeStep?.label || "Preparing analysis"}
        statusDetail={currentRuntimeStep?.detail || "The agent is processing the current workspace."}
        progressPct={progressPct}
        steps={runningSteps}
        metrics={[
          { label: "Progress", value: `${Math.max(2, progressPct)}%`, hint: "runtime" },
          { label: "Stages", value: `${Math.min(activeStep + 1, props.preloaderSteps.length)}/${props.preloaderSteps.length}`, hint: "pipeline" },
          { label: "Source", value: props.docLabel, hint: "active input" },
          { label: "Run", value: props.latestRunLabel || "live", hint: "execution id" },
        ]}
        metaItems={[
          { label: "Workspace", value: props.caseTitle },
          { label: sourceDescriptorLabel, value: props.sourceLabel },
          ...(typeof props.docPages === "number" && props.docPages > 0 ? [{ label: "Pages", value: `${props.docPages} pages` }] : []),
          { label: "Role", value: props.roleBadge },
        ]}
        evidenceItems={[
          {
            id: "role-workspace",
            group: "CURRENT INPUT",
            title: props.caseTitle,
            meta: "Active workspace",
            snippet: "The current case workspace is attached to this role-specific run.",
          },
          {
            id: "role-source-doc",
            group: "USER DOC",
            title: props.docLabel,
            meta: typeof props.docPages === "number" && props.docPages > 0 ? `${props.sourceLabel} · ${props.docPages} pages` : props.sourceLabel,
            snippet: "This source input is being used as the grounding input for the current agent run.",
          },
        ]}
        footerNote="Stages update automatically while the role agent reads evidence, builds reasoning, and prepares the final response."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={props.onBack}>
              {props.backLabel || "Back"}
            </Button>
            {canOpenSource ? (
              <Button variant="outline" size="sm" onClick={props.onViewDoc}>
                {sourceActionLabel}
              </Button>
            ) : null}
          </div>
        }
      />
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6 pt-10 md:p-8 md:pt-14 space-y-6">
      <div className="space-y-4">
        <Button variant="outline" onClick={props.onBack}>
          {props.backLabel || "Back to Query Parsing"}
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Role Agent</p>
            <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight mt-1">{props.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Case: {props.caseTitle}</Badge>
              <Badge>{props.roleBadge}</Badge>
              <Button variant="ghost" size="sm" onClick={props.onSwitchCase}>
                Switch Case
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canOpenSource ? (
              <Button variant="outline" onClick={props.onViewDoc}>
                {sourceActionLabel}
              </Button>
            ) : null}
            {props.supportsExportPdf && props.exportUrl && props.state === "done" ? (
              <Button onClick={handleExportPdf}>Export PDF</Button>
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6">
          <p className="text-muted-foreground">{sourceLeadLabel}</p>
          <p className="text-2xl font-semibold mt-1">{props.docLabel}</p>
          <p className="text-sm text-muted-foreground">{props.sourceLabel}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {showRunAction ? (
              <Button onClick={props.onRun} className="cursor-pointer">
                <Play className="h-4 w-4 mr-2" />
                {props.state === "empty" ? "Run" : "Re-run"}
              </Button>
            ) : null}
            {props.latestRunLabel && !props.hideRunMeta ? (
              <span className="text-xs text-muted-foreground">Last run: {props.latestRunLabel}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!props.hideRecentRuns ? (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-sm font-medium mb-3">Recent Runs</div>
            <div className="space-y-2">
              {(props.recentRuns || []).map((run) => {
                const rawTitle = String(run.case_title || "").trim();
                const shortId = String(run.case_id || "").slice(0, 8);
                const rowTitle = rawTitle || (shortId ? `Case ${shortId}` : "Case Workspace");
                return (
                  <button
                    key={run.run_id}
                    type="button"
                    onClick={() => props.onOpenRecentRun(run)}
                    className="w-full text-left rounded-md border p-3 text-sm flex items-center justify-between gap-3 hover:border-primary transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{rowTitle}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {shortId ? `ID: ${shortId}` : "ID: Not available"}
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline">{run.status}</Badge>
                      </div>
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(run.timestamp).toLocaleString()}
                    </span>
                  </button>
                );
              })}
              {!(props.recentRuns || []).length ? (
                <div className="text-sm text-muted-foreground">No recent role-agent runs yet.</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {props.state === "error" ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="font-semibold">Analysis failed</p>
            <p className="text-sm text-muted-foreground">{props.output?.failure_reason || "Run failed"}</p>
            <Button className="mt-3" onClick={props.onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {props.state === "done" ? (
        <div className="space-y-4">
          {hasWarning ? (
            <Card className="border-orange-500/40">
              <CardContent className="pt-5">
                <p className="font-semibold">Completed with review note</p>
                <p className="text-sm text-muted-foreground">
                  Grounded output is limited due to insufficient evidence snippets for this run.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {sections.slice(0, 1).map((section: any, index: number) => {
              const variant = layoutPattern[index] || (index === 0 ? "hero" : index % 3 === 0 ? "full" : "split");
              return (
                <Card key={section.id} className={sectionVariantClasses[variant] || "lg:col-span-1"}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderSectionContent(section.content)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          typeof section.content === "string" ? section.content : JSON.stringify(section.content, null, 2),
                        );
                        toast({ title: "Copied" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="lg:col-span-1 lg:self-start">
              <CardHeader>
                <CardTitle className="text-base">Grounding Citations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {citations.length ? (
                  citations.map((c: any) => (
                    <div key={c.citation_id} className="rounded-md border p-2">
                      <p className="text-xs uppercase text-muted-foreground">{c.source_type}</p>
                      <p className="text-xs text-muted-foreground">{c.doc_id}</p>
                      <p className="text-sm">{c.snippet}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No citations</p>
                )}
              </CardContent>
            </Card>
            {sections.slice(1).map((section: any, index: number) => {
              const actualIndex = index + 1;
              const variant = layoutPattern[actualIndex] || (actualIndex % 3 === 0 ? "full" : "split");
              return (
                <Card key={section.id} className={sectionVariantClasses[variant] || "lg:col-span-1"}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderSectionContent(section.content)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          typeof section.content === "string" ? section.content : JSON.stringify(section.content, null, 2),
                        );
                        toast({ title: "Copied" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {props.state === "empty" && props.isHydrating ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />Loading saved report...
          </CardContent>
        </Card>
      ) : null}

      {props.state === "empty" && !props.isHydrating ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />Not run yet. Click Run to analyze this case.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

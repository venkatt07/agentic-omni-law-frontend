import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/lib/magic-ui";
import { useAppStore } from "@/store";
import { caseService, type CaseDetailsResponse } from "@/services/caseService";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { RefreshCw, Sparkles, Workflow } from "lucide-react";

type FinalSummaryAgentRow = {
  agentKey: string;
  agentLabel: string;
  summary: string;
  citations: number;
  status: "ready" | "warning";
};

export default function Summaries() {
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [caseDetails, setCaseDetails] = useState<CaseDetailsResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = async (showSpinner = true) => {
    if (!activeCaseId) {
      setMode("ready");
      setCaseDetails(null);
      return;
    }
    if (showSpinner) setMode("loading");
    else setRefreshing(true);
    setErrorMessage("");
    try {
      const details = await caseService.fetchCase(activeCaseId);
      setCaseDetails(details);
      setMode("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load final summary from the case workspace.");
      setMode("error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, [activeCaseId]);

  const summaryOutput = useMemo(() => {
    if (!caseDetails) return null;
    const storeSummary = useAppStore.getState().casesById[activeCaseId || ""]?.outputs.final_summary;
    return storeSummary || caseDetails.final_summary || caseDetails.outputs?.final_summary || null;
  }, [activeCaseId, caseDetails]);
  const agentSummaries = (summaryOutput?.byAgent || []) as FinalSummaryAgentRow[];
  const hasSummaryText = typeof summaryOutput?.summary === "string" && summaryOutput.summary.trim().length > 0;
  const hasAnySummary = hasSummaryText || agentSummaries.length > 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {mode === "loading" ? <LoadingState title="Loading final summary" description="Fetching the consolidated output from the live case workspace." /> : null}
      {mode === "error" ? (
        <ErrorState
          title="Summary generation failed"
          description={errorMessage || "Please rerun the agent pipeline."}
          actionLabel="Retry"
          onAction={() => void loadSummary()}
        />
      ) : null}
      {mode !== "ready" ? null : (
        <>
          <FadeIn>
            <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold font-heading">Consolidated Summary</h1>
                <p className="text-muted-foreground mt-1">
                  Backend-backed final view of the current case workspace and its agent outputs.
                </p>
              </div>
              {activeCaseId ? (
                <Button variant="outline" onClick={() => void loadSummary(false)} disabled={refreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              ) : null}
            </div>
          </FadeIn>

          {!activeCaseId ? (
            <FadeIn delay={0.1}>
              <EmptyState
                title="No active case selected"
                description="Choose a case workspace first, then the final summary page will pull the consolidated output from that case."
                actionLabel="Open Case History"
                onAction={() => setLocation("/app/cases")}
              />
            </FadeIn>
          ) : hasAnySummary ? (
            <FadeIn delay={0.15}>
              <div className="space-y-4">
                <Card className="p-6 rounded-[1.5rem] border-border/60">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Final workspace report</div>
                      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                        {caseDetails?.title || "Current Case Workspace"}
                      </h2>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {agentSummaries.length} contributing agent{agentSummaries.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-8 text-muted-foreground">
                    {hasSummaryText ? summaryOutput?.summary : "No consolidated narrative is available yet, but agent-level summaries are present below."}
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Generated at: {summaryOutput?.generatedAt || "N/A"}
                  </p>
                </Card>

                {agentSummaries.length > 0 ? (
                  <Card className="p-6 rounded-[1.5rem] border-border/60">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold">Agent summaries</h2>
                    </div>
                    <div className="mt-4 space-y-3">
                      {agentSummaries.map((agent: FinalSummaryAgentRow) => (
                        <Card key={agent.agentKey} className="p-4 border-border/60 bg-background/40">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold">{agent.agentLabel}</h3>
                            <Badge variant={agent.status === "warning" ? "destructive" : "secondary"}>
                              {agent.status === "warning" ? "Warning" : "Ready"}
                            </Badge>
                            <Badge variant="outline">{agent.citations} citation{agent.citations === 1 ? "" : "s"}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 leading-7">{agent.summary}</p>
                        </Card>
                      ))}
                    </div>
                  </Card>
                ) : null}
              </div>
            </FadeIn>
          ) : (
            <FadeIn delay={0.15}>
              <EmptyState
                title="No consolidated summary saved yet"
                description="This case does not have a final summary yet. Run Query Parsing and downstream agents first, then return here for the consolidated report."
                actionLabel="Open Query Parsing"
                onAction={() => setLocation(`/app/agents/query?caseId=${encodeURIComponent(activeCaseId)}`)}
                icon={<Sparkles className="h-6 w-6" />}
              />
            </FadeIn>
          )}

          <FadeIn delay={0.2}>
            <Card className="mt-5 p-4 flex flex-wrap gap-2 rounded-[1.5rem]">
              <Button onClick={() => setLocation("/app/dashboard")} aria-label="Back to dashboard">
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(activeCaseId ? `/app/cases/${activeCaseId}` : "/app/cases")}
                aria-label="Open current workspace"
              >
                Open Workspace
              </Button>
            </Card>
          </FadeIn>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  Activity,
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  FolderOpen,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/lib/magic-ui";
import { ErrorState, EmptyState, LoadingState } from "@/components/app/PageState";
import { useAppStore } from "@/store";
import { caseService, type CaseDetailsResponse } from "@/services/caseService";
import { cn } from "@/lib/utils";

const OUTPUT_META: Record<string, { title: string; href: string; icon: typeof Sparkles }> = {
  query_parsing: { title: "Query Parsing", href: "/app/agents/query/result", icon: FileSearch },
  contract_risk_dispute_settlement: { title: "Contract Risk", href: "/app/agents/contract", icon: FileText },
  case_outcome_deadline_penalty: { title: "Outcome Prediction", href: "/app/agents/outcome", icon: Activity },
  policy_compliance: { title: "Policy Compliance", href: "/app/agents/compliance", icon: CheckCircle2 },
  legal_drafts_validation: { title: "Legal Drafts", href: "/app/agents/draft", icon: BookOpenText },
  final_summary: { title: "Final Summary", href: "/app/agents/summary", icon: Sparkles },
};

function formatStatusLabel(value: string) {
  return String(value || "Unknown").replaceAll("_", " ");
}

export default function CaseWorkspace() {
  const [match, params] = useRoute("/app/cases/:caseId");
  const caseId = match ? params.caseId : "";
  const workspace = useAppStore((state) => state.caseWorkspace);
  const casesById = useAppStore((state) => state.casesById);
  const language = useAppStore((state) => state.language);
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const [mode, setMode] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [caseDetails, setCaseDetails] = useState<CaseDetailsResponse | null>(null);

  const loadWorkspace = async (showSpinner = true) => {
    if (!caseId) return;
    if (showSpinner) setMode("loading");
    else setRefreshing(true);
    setErrorMessage("");
    try {
      const details = await caseService.fetchCase(caseId);
      setCaseDetails(details);
      const resolvedTitle = String(details.title || "").trim() || "Case Workspace";
      setCaseWorkspace(caseId, resolvedTitle);
      await caseService.activateCase(caseId, resolvedTitle).catch(() => undefined);
      setMode("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load this case workspace.");
      setMode("error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    void loadWorkspace(false);
  }, [caseId, language]);

  const caseRecord = caseId ? casesById[caseId] : undefined;
  const documents = useMemo(
    () => (caseDetails?.documents || []).filter((doc) => {
      const normalized = String(doc.name || "").trim().toLowerCase();
      return normalized && normalized !== "query-context" && normalized !== "query input" && normalized !== "pasted text";
    }),
    [caseDetails],
  );
  const agentStatuses = Object.entries(caseDetails?.agent_status || {});
  const outputCards = Object.entries(caseDetails?.outputs || {}).filter(([, value]) => value && typeof value === "object");
  const hasFinalSummary = Boolean(caseDetails?.final_summary);
  const outputCount = outputCards.length + (hasFinalSummary ? 1 : 0);
  const runningAgentCount = agentStatuses.filter(([, value]: [string, any]) => value?.state === "RUNNING").length;
  const successfulAgentCount = agentStatuses.filter(([, value]: [string, any]) => value?.state === "SUCCEEDED").length;

  const caseInfo = useMemo(() => {
    const hasOutputs = outputCount > 0;
    return {
      title: caseDetails?.title || caseRecord?.title || "Case Workspace",
      domain:
        (caseDetails?.domain_primary && caseDetails?.domain_subtype
          ? `${caseDetails.domain_primary} / ${caseDetails.domain_subtype}`
          : caseDetails?.domain_primary) ||
        caseRecord?.domain ||
        "General",
      status: runningAgentCount > 0 ? "Active" : hasOutputs ? "Review" : "Drafting",
      updatedAt:
        caseDetails?.created_at
          ? new Date(caseDetails.created_at).toLocaleString("en-IN")
          : caseRecord?.lastUpdated || "Recently",
      lastQuery: caseRecord?.lastQuery || "",
    };
  }, [caseDetails, caseRecord, outputCount, runningAgentCount]);

  const nextAction = useMemo(() => {
    if (!documents.length) {
      return {
        title: "Add source documents",
        description: "Upload agreements, petitions, notices, orders, or evidence so the workspace has material to reason over.",
        href: `/app/documents/upload?caseId=${encodeURIComponent(caseId)}&focusUpload=1`,
        label: "Upload Documents",
        icon: Upload,
      };
    }
    if (!outputCards.some(([key]) => key === "query_parsing")) {
      return {
        title: "Run Query Parsing first",
        description: "Structure the matter before sending it to downstream agents. This grounds the rest of the workspace.",
        href: `/app/cases/${encodeURIComponent(caseId)}/agents/query-parsing`,
        label: "Open Query Parsing",
        icon: FileSearch,
      };
    }
    if (!hasFinalSummary) {
      return {
        title: "Consolidate the case",
        description: "Generate or review the final summary once the core agents have produced outputs.",
        href: "/app/agents/summary",
        label: "Open Final Summary",
        icon: Sparkles,
      };
    }
    return {
      title: "Continue working this matter",
      description: "The workspace already has source material and outputs. Jump into the next agent or review saved artifacts.",
      href: "/app/agents/query",
      label: "Open Agents",
      icon: PlayCircle,
    };
  }, [caseId, documents.length, hasFinalSummary, outputCards]);

  if (mode === "loading") {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <LoadingState title="Loading case workspace" description="Reading live case details, documents, outputs, and agent status." />
      </div>
    );
  }

  if (mode === "error") {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <ErrorState
          title="Case workspace unavailable"
          description={errorMessage}
          actionLabel="Retry"
          onAction={() => void loadWorkspace()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/cases">
          <Button variant="ghost" className="rounded-full px-3">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Case History
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => void loadWorkspace(false)} disabled={refreshing}>
          <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh workspace
        </Button>
      </div>

      <FadeIn>
        <section className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-[linear-gradient(135deg,rgba(8,32,79,0.98),rgba(13,71,196,0.95)_52%,rgba(43,132,255,0.92))] px-6 py-7 text-white shadow-[0_32px_80px_-44px_rgba(2,6,23,0.78)] md:px-8 md:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(58%_50%_at_0%_0%,rgba(255,255,255,0.18),transparent_40%),radial-gradient(44%_36%_at_100%_0%,rgba(34,211,238,0.18),transparent_36%)]" />
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="max-w-[48rem]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/68">{caseId}</div>
              <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] md:text-[3rem]">{caseInfo.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="border-white/14 bg-white/10 text-white hover:bg-white/10">{caseInfo.domain}</Badge>
                <Badge className="border-white/14 bg-white/10 text-white hover:bg-white/10">{caseInfo.status}</Badge>
                {caseDetails?.language ? <Badge className="border-white/14 bg-white/10 text-white hover:bg-white/10">{caseDetails.language}</Badge> : null}
              </div>
              <p className="mt-4 max-w-[42rem] text-sm leading-8 text-white/74 md:text-base">
                This workspace keeps case documents, agent outputs, and run state attached to one matter so you can continue without rebuilding context.
              </p>
              {caseInfo.lastQuery ? (
                <div className="mt-5 rounded-[1.2rem] border border-white/12 bg-white/[0.08] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/58">Latest query context</div>
                  <p className="mt-2 text-sm leading-7 text-white/84">{caseInfo.lastQuery}</p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="border-white/12 bg-white/[0.08] p-4 text-white shadow-none">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Updated</div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm">
                  <Clock3 className="h-4 w-4" />
                  {caseInfo.updatedAt}
                </div>
              </Card>
              <Card className="border-white/12 bg-white/[0.08] p-4 text-white shadow-none">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Workspace state</div>
                <div className="mt-2 text-sm">{workspace.caseId === caseId ? "Active in your workspace" : "Loaded from backend"}</div>
              </Card>
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Documents", value: String(documents.length), icon: FolderOpen },
            { label: "Saved outputs", value: String(outputCount), icon: Sparkles },
            { label: "Running now", value: String(runningAgentCount), icon: Activity },
            { label: "Completed agents", value: String(successfulAgentCount), icon: CheckCircle2 },
          ].map((item) => (
            <Card key={item.label} className="rounded-[1.35rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</div>
                  <div className="mt-2 text-[2rem] font-semibold tracking-[-0.04em]">{item.value}</div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </FadeIn>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <FadeIn delay={0.08}>
          <Card className="rounded-[1.5rem] p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Next best step</div>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{nextAction.title}</h2>
                <p className="mt-2 max-w-[50ch] text-sm leading-7 text-muted-foreground">{nextAction.description}</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary md:flex">
                <nextAction.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={nextAction.href}>
                <Button className="rounded-full">{nextAction.label}</Button>
              </Link>
              <Link href={`/app/documents/upload?caseId=${encodeURIComponent(caseId)}&focusUpload=1`}>
                <Button variant="outline" className="rounded-full">Add Documents</Button>
              </Link>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="rounded-[1.5rem] p-5 md:p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Workspace notes</div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-[1rem] bg-muted/35 p-3">
                Documents uploaded through Query Parsing and Document Upload stay attached to this case.
              </div>
              <div className="rounded-[1rem] bg-muted/35 p-3">
                Query Parsing should usually be the first step before downstream agents.
              </div>
              <div className="rounded-[1rem] bg-muted/35 p-3">
                If nothing appears yet, this page will still guide the user toward the next action instead of showing a blank shell.
              </div>
            </div>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <FadeIn delay={0.12}>
          <Card className="rounded-[1.5rem] p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Case documents</div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Attached source material</h2>
              </div>
              <Link href={`/app/documents/upload?caseId=${encodeURIComponent(caseId)}&focusUpload=1`}>
                <Button variant="outline" size="sm" className="rounded-full">Upload</Button>
              </Link>
            </div>
            {documents.length ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <Link key={doc.doc_id} href={`/app/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(doc.doc_id)}`}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 rounded-[1.15rem] border border-border/70 bg-background/70 p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{doc.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{doc.type} • {(Number(doc.size || 0) / (1024 * 1024)).toFixed(1)} MB</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleString("en-IN")}</div>
                    </button>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No source documents in this case yet"
                description="Upload petitions, contracts, notices, court orders, or supporting evidence to turn this into a real working matter."
                actionLabel="Upload Documents"
                onAction={() => {
                  window.location.href = `/app/documents/upload?caseId=${encodeURIComponent(caseId)}&focusUpload=1`;
                }}
                icon={<Upload className="h-6 w-6" />}
              />
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card className="rounded-[1.5rem] p-5 md:p-6">
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Saved outputs</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Agent results already in the workspace</h2>
            </div>
            {outputCount ? (
              <div className="space-y-3">
                {outputCards.map(([key]) => {
                  const meta = OUTPUT_META[key] || { title: formatStatusLabel(key), href: "/app/agents", icon: Sparkles };
                  return (
                    <Link key={key} href={meta.href}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-[1.15rem] border border-border/70 bg-background/70 p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <meta.icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="font-medium">{meta.title}</div>
                            <div className="text-xs text-muted-foreground">Saved to this case workspace</div>
                          </div>
                        </div>
                        <Badge variant="secondary">Ready</Badge>
                      </button>
                    </Link>
                  );
                })}
                {hasFinalSummary ? (
                  <Link href="/app/agents/summary">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-[1.15rem] border border-border/70 bg-background/70 p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Sparkles className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="font-medium">Final Summary</div>
                          <div className="text-xs text-muted-foreground">Consolidated workspace report</div>
                        </div>
                      </div>
                      <Badge variant="secondary">Ready</Badge>
                    </button>
                  </Link>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No saved agent outputs yet"
                description="Once Query Parsing or any downstream agent runs successfully, the result will appear here as a reusable workspace artifact."
                actionLabel="Open Query Parsing"
                onAction={() => {
                  window.location.href = `/app/cases/${encodeURIComponent(caseId)}/agents/query-parsing`;
                }}
                icon={<Sparkles className="h-6 w-6" />}
              />
            )}
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.18}>
        <Card className="rounded-[1.5rem] p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Agent pipeline</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Live workspace status</h2>
            </div>
          </div>
          {agentStatuses.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {agentStatuses.map(([key, value]: [string, any]) => {
                const state = String(value?.state || "Unknown");
                const badgeVariant =
                  state === "SUCCEEDED" ? "secondary" :
                  state === "RUNNING" ? "default" :
                  state === "FAILED" ? "destructive" :
                  "outline";
                return (
                  <div key={key} className="rounded-[1.15rem] border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{formatStatusLabel(key)}</div>
                      <Badge variant={badgeVariant as any}>{state}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Updated {value?.updated_at ? new Date(value.updated_at).toLocaleString("en-IN") : "recently"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No agent activity yet"
              description="This is a new or inactive case. Start with Query Parsing to create the first tracked run in this workspace."
              actionLabel="Start Query Parsing"
              onAction={() => {
                window.location.href = `/app/cases/${encodeURIComponent(caseId)}/agents/query-parsing`;
              }}
              icon={<PlayCircle className="h-6 w-6" />}
            />
          )}
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card className="rounded-[1.5rem] p-5 md:p-6">
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Workspace actions</div>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Move through the case</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { href: `/app/cases/${encodeURIComponent(caseId)}/agents/query-parsing`, label: "Query Parsing", variant: "default" as const },
              { href: "/app/agents/contract", label: "Contract Risk", variant: "outline" as const },
              { href: "/app/agents/outcome", label: "Outcome Prediction", variant: "outline" as const },
              { href: "/app/agents/summary", label: "Final Summary", variant: "outline" as const },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant={action.variant} className="h-11 w-full rounded-xl">{action.label}</Button>
              </Link>
            ))}
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

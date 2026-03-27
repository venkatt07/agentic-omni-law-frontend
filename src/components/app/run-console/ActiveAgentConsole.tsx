import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { RunNode } from "./useRunState";

interface ActiveAgentConsoleProps {
  caseTitle: string;
  statusLabel: string;
  elapsedLabel: string;
  subtitle?: string;
  overallProgress?: number;
  footerNote?: string;
  action?: ReactNode;
  runType?: "single_agent" | "multi_agent";
  nodes: RunNode[];
  node: RunNode;
  reportHref?: string;
}

export default function ActiveAgentConsole({
  caseTitle,
  elapsedLabel,
  subtitle,
  overallProgress,
  footerNote,
  action,
  runType = "multi_agent",
  nodes,
  node,
  reportHref,
}: ActiveAgentConsoleProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const progress = Math.max(12, Math.min(100, Math.round(overallProgress ?? node.progress ?? 12)));
  const resultChips = node.resultPreview || [];
  const completedCount = nodes.filter((item) => item.status === "done").length;
  const activeCount = nodes.filter((item) => item.status === "running").length;
  const waitingCount = nodes.filter((item) => item.status === "queued").length;
  const modeLabel = runType === "single_agent" ? `${node.label} run` : t("run.parseHandoff");
  const supportingCount = runType === "single_agent" ? Math.max(0, completedCount + activeCount) : waitingCount;
  const supportingLabel = runType === "single_agent" ? "Logged steps" : t("run.waiting");
  const statusMeta =
    node.status === "done"
      ? {
          label: t("run.completed"),
          icon: CheckCircle2,
          className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        }
      : node.status === "error"
        ? {
            label: t("run.issue"),
            icon: XCircle,
            className: "bg-destructive/10 text-destructive",
          }
        : node.status === "blocked"
          ? {
              label: t("run.blocked"),
              icon: AlertTriangle,
              className: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
            }
          : node.status === "queued"
            ? {
                label: t("run.waiting"),
                icon: Clock3,
                className: "bg-black/[0.05] text-muted-foreground dark:bg-white/[0.08]",
              }
            : {
                label: node.key === "query_parsing" ? t("run.parsingWorkspace") : t("run.working"),
                icon: Loader2,
                className: "bg-primary/10 text-primary",
              };
  const StatusIcon = statusMeta.icon;
  const runtimeSummary =
    node.status === "done"
      ? `${node.label} completed successfully and its output is saved in the current case workspace.`
      : node.status === "error"
        ? `${node.label} reported a runtime issue before finishing its current output.`
        : subtitle ||
          (runType === "single_agent"
            ? `${node.label} is working on the current workspace and logging each step as it completes.`
            : node.key === "query_parsing"
            ? "Query Parsing is reading the workspace now. Once parsing completes, the remaining agents can start from the same structured case context."
            : `${node.label} is using the parsed workspace context produced by Query Parsing.`);

  return (
    <div className="min-w-0">
      <section className="border-b border-black/6 pb-4 dark:border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
            {t("run.agentRun")}
          </Badge>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {elapsedLabel}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled={node.status !== "error"}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("run.retryFailed")}
            </Button>
            {runType === "single_agent" && node.status === "done" && reportHref ? (
              <Button asChild size="sm" className="rounded-full">
                <a href={reportHref}>
                  {t("run.viewFullReport")}
                </a>
              </Button>
            ) : null}
            {action}
          </div>
        </div>
      </section>

      {node.status === "error" ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/15 bg-destructive/[0.04] px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span>{t("run.failedBanner")}</span>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[clamp(1.5rem,2.45vw,2.25rem)] font-semibold tracking-[-0.06em] text-foreground">
              {node.label}
            </h2>
            <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", statusMeta.className)}>
              <StatusIcon className={cn("h-4 w-4", node.status === "running" && "animate-spin")} />
              {statusMeta.label}
            </span>
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-black/6 px-4 py-3.5 dark:border-white/[0.08]">
            <div className="mb-2.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span>{t("run.runtimeProgress")}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("run.mode")}</div>
                <div className="mt-1.5 text-base font-semibold text-foreground">{modeLabel}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("run.runningNow")}</div>
                <div className="mt-1.5 text-base font-semibold text-foreground">{activeCount}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{supportingLabel}</div>
                <div className={cn("mt-1.5 text-base font-semibold", supportingCount ? "text-foreground" : "text-muted-foreground")}>
                  {supportingCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-[1.5rem] border border-black/6 px-4 py-3.5 dark:border-white/[0.08]">
          <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {t("run.runtime")}
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("run.focusedAgent")}</span>
              <span className="truncate font-medium text-foreground">{node.label}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("run.state")}</span>
              <span className="font-medium text-foreground">
                {node.status === "running" ? t("run.active") : node.status === "done" ? t("run.completed") : node.status === "error" ? t("run.issue") : t("run.waiting")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Workspace</span>
              <span className="truncate font-medium text-foreground">{caseTitle}</span>
            </div>
            {runType === "single_agent" ? (
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Current focus</span>
                <span className="max-w-[12rem] text-right font-medium leading-6 text-foreground">
                  {runtimeSummary}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t("run.waiting")}</span>
                <span className="font-medium text-foreground">{waitingCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {(node.status === "done" || footerNote) ? (
        <div className="mt-6 border-t border-black/6 pt-4 dark:border-white/[0.08]">
          {node.status === "done" ? (
            <div className="flex flex-wrap gap-2">
              {resultChips.length ? (
                resultChips.map((chip) => (
                  <span
                    key={`${chip.label}-${chip.value}`}
                    className="rounded-full bg-black/[0.04] px-3 py-1.5 text-sm text-foreground dark:bg-white/[0.06]"
                  >
                    <span className="text-muted-foreground">{chip.label}</span> {chip.value}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-sm text-foreground dark:bg-white/[0.06]">
                  {t("run.outputReady")}
                </span>
              )}
            </div>
          ) : null}

          {footerNote ? (
            <div className="mt-4 text-sm leading-7 text-muted-foreground">
              {footerNote}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

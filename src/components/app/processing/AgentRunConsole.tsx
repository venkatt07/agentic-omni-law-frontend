import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Bot,
  Check,
  FilePenLine,
  FileSearch,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import AgentRunTopRail from "@/components/app/processing/AgentRunTopRail";
import AgentInstrumentStrip, { type InstrumentItem } from "@/components/app/processing/AgentInstrumentStrip";
import type { ExecutionStage } from "@/components/app/processing/AgentExecutionTimeline";
import type { RuntimeEvent } from "@/components/app/processing/AgentEventStream";
import type { AnalysisSignal } from "@/components/app/processing/AgentAnalysisField";
import type { InspectorFocus } from "@/components/app/processing/AgentContextInspector";
import { cn } from "@/lib/utils";

interface AgentRunConsoleProps {
  agentName: string;
  caseTitle: string;
  jurisdiction?: string;
  headline: string;
  sentence: string;
  phaseLabel: string;
  stages: ExecutionStage[];
  events: RuntimeEvent[];
  signals: AnalysisSignal[];
  instruments: InstrumentItem[];
  initialFocus?: InspectorFocus;
  action?: ReactNode;
}

function visualForAgent(agentName: string) {
  const name = agentName.toLowerCase();
  if (name.includes("query")) {
    return {
      Icon: Search,
      aura: "from-sky-500/26 via-blue-500/10 to-transparent dark:from-sky-400/22 dark:via-blue-500/10 dark:to-transparent",
      ring: "border-sky-500/28 dark:border-sky-400/28",
      icon: "text-sky-600 dark:text-sky-300",
      microcopy: "Parsing intent, jurisdiction, and authority scope.",
    };
  }
  if (name.includes("contract")) {
    return {
      Icon: FileSearch,
      aura: "from-violet-500/22 via-fuchsia-500/10 to-transparent dark:from-violet-400/18 dark:via-fuchsia-500/10 dark:to-transparent",
      ring: "border-violet-500/24 dark:border-violet-400/24",
      icon: "text-violet-600 dark:text-violet-300",
      microcopy: "Reading clauses and testing commercial risk.",
    };
  }
  if (name.includes("outcome")) {
    return {
      Icon: TrendingUp,
      aura: "from-emerald-500/22 via-cyan-500/10 to-transparent dark:from-emerald-400/18 dark:via-cyan-500/10 dark:to-transparent",
      ring: "border-emerald-500/24 dark:border-emerald-400/24",
      icon: "text-emerald-600 dark:text-emerald-300",
      microcopy: "Comparing precedent patterns and likely direction.",
    };
  }
  if (name.includes("compliance") || name.includes("policy")) {
    return {
      Icon: ShieldCheck,
      aura: "from-amber-500/20 via-orange-500/10 to-transparent dark:from-amber-300/18 dark:via-orange-500/10 dark:to-transparent",
      ring: "border-amber-500/22 dark:border-amber-300/22",
      icon: "text-amber-600 dark:text-amber-300",
      microcopy: "Checking obligations, fit, and compliance gaps.",
    };
  }
  if (name.includes("draft")) {
    return {
      Icon: FilePenLine,
      aura: "from-rose-500/20 via-fuchsia-500/10 to-transparent dark:from-rose-400/18 dark:via-fuchsia-500/10 dark:to-transparent",
      ring: "border-rose-500/22 dark:border-rose-400/22",
      icon: "text-rose-600 dark:text-rose-300",
      microcopy: "Structuring legal language and final draft output.",
    };
  }
  if (name.includes("family")) {
    return {
      Icon: Users,
      aura: "from-cyan-500/20 via-sky-500/10 to-transparent dark:from-cyan-400/18 dark:via-sky-500/10 dark:to-transparent",
      ring: "border-cyan-500/22 dark:border-cyan-400/22",
      icon: "text-cyan-600 dark:text-cyan-300",
      microcopy: "Turning legal analysis into plain-language guidance.",
    };
  }
  if (name.includes("cost")) {
    return {
      Icon: Banknote,
      aura: "from-lime-500/18 via-emerald-500/10 to-transparent dark:from-lime-400/16 dark:via-emerald-500/10 dark:to-transparent",
      ring: "border-lime-500/22 dark:border-lime-400/22",
      icon: "text-lime-600 dark:text-lime-300",
      microcopy: "Estimating likely legal spend and cost drivers.",
    };
  }
  return {
    Icon: Bot,
    aura: "from-sky-500/20 via-violet-500/10 to-transparent dark:from-sky-400/18 dark:via-violet-500/10 dark:to-transparent",
    ring: "border-sky-500/24 dark:border-sky-400/24",
    icon: "text-sky-600 dark:text-sky-300",
    microcopy: "Building the next grounded response for this workspace.",
  };
}

export default function AgentRunConsole({
  agentName,
  caseTitle,
  jurisdiction,
  headline,
  sentence,
  phaseLabel,
  stages,
  events,
  instruments,
  initialFocus,
  action,
}: AgentRunConsoleProps) {
  const activeStage = useMemo(
    () =>
      stages.find((stage) => stage.state === "active") ||
      stages.find((stage) => stage.state === "complete") ||
      stages[0],
    [stages],
  );
  const completedCount = stages.filter((stage) => stage.state === "complete").length;
  const progressPct = stages.length ? Math.max(6, Math.round((completedCount / stages.length) * 100)) : 0;
  const liveFeed = events.slice(0, 4);
  const detail = initialFocus?.detail || activeStage?.detail || sentence;
  const { Icon, aura, ring, icon, microcopy } = visualForAgent(agentName);

  return (
    <>
      <AgentRunTopRail
        agentName={agentName}
        caseTitle={caseTitle}
        jurisdiction={jurisdiction}
        phaseLabel={phaseLabel}
        action={action}
      />

      <div className="flex flex-1 items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] lg:gap-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/55" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
              </span>
              Agent is working
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="mt-5 max-w-[10ch] text-balance text-[clamp(2.6rem,6vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.085em] text-slate-950 dark:text-white"
            >
              {headline}
            </motion.h1>

            <p className="mt-4 max-w-[40rem] text-[1rem] leading-8 text-slate-600 dark:text-slate-300/82">
              {sentence}
            </p>

            <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-center">
              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                <motion.div
                  className={cn("absolute inset-0 rounded-full bg-gradient-to-br blur-2xl", aura)}
                  animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.55, 0.9, 0.55] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className={cn("absolute inset-3 rounded-full border", ring)}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className={cn("absolute inset-8 rounded-full border", ring)}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/55 bg-white/70 shadow-[0_24px_52px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_52px_-34px_rgba(2,6,23,0.82)]">
                  <Icon className={cn("h-8 w-8", icon)} />
                </div>
                <motion.span
                  className="absolute left-4 top-8 h-2.5 w-2.5 rounded-full bg-sky-400/75"
                  animate={{ y: [0, -8, 0], opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.span
                  className="absolute bottom-6 right-6 h-2 w-2 rounded-full bg-violet-400/70"
                  animate={{ y: [0, 9, 0], opacity: [0.3, 0.92, 0.3] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
              </div>

              <div className="min-w-0 max-w-[38rem]">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
                  Current stage
                </div>
                <div className="mt-2 text-[clamp(1.65rem,2.5vw,2.75rem)] font-semibold tracking-[-0.055em] text-slate-950 dark:text-white">
                  {activeStage?.label || phaseLabel}
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300/84">
                  {detail}
                </div>
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-300" />
                  <span>{microcopy}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 max-w-[48rem]">
              <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <span>Runtime progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/88 dark:bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.95),rgba(125,211,252,0.78),rgba(168,85,247,0.65))]"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                />
              </div>
            </div>

            {liveFeed.length ? (
              <div className="mt-8 max-w-[48rem]">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
                  Live activity
                </div>
                <div className="mt-4 space-y-3">
                  {liveFeed.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.14), ease: "easeOut" }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className={cn(
                          "mt-2 h-2 w-2 rounded-full",
                          event.marker === "live"
                            ? "bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.55)]"
                            : event.marker === "success"
                              ? "bg-emerald-400"
                              : "bg-slate-400 dark:bg-slate-500",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-sm leading-6 text-slate-800 dark:text-slate-200">{event.text}</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-slate-500">{event.meta}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
              Runtime steps
            </div>

            <div className="mt-5 space-y-3">
              {stages.map((stage, index) => (
                <motion.div
                  key={stage.key}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.14), ease: "easeOut" }}
                  className="flex items-start gap-3"
                >
                  <div className="flex w-6 shrink-0 flex-col items-center">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center">
                      {stage.state === "complete" ? (
                        <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                      ) : stage.state === "active" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-sky-500 dark:text-sky-300" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                    </div>
                    {index < stages.length - 1 ? (
                      <div className="mt-1 h-10 w-px bg-slate-200 dark:bg-white/[0.08]" />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-2 pt-0.5">
                    <div
                      className={cn(
                        "text-[1.02rem] font-medium tracking-[-0.03em]",
                        stage.state === "active"
                          ? "text-slate-950 dark:text-white"
                          : stage.state === "complete"
                            ? "text-slate-700 dark:text-slate-200"
                            : "text-slate-500 dark:text-slate-400",
                      )}
                    >
                      {stage.label}
                    </div>
                    {stage.state === "active" ? (
                      <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300/82">
                        {stage.detail}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AgentInstrumentStrip items={instruments} />
    </>
  );
}

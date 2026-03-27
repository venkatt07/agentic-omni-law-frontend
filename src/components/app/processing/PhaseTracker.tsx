import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspacePhase } from "./types";

interface PhaseTrackerProps {
  phases: WorkspacePhase[];
}

export default function PhaseTracker({ phases }: PhaseTrackerProps) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.015))] p-4">
      <div className="mb-4 text-[10px] uppercase tracking-[0.26em] text-slate-400">Execution phases</div>
      <div className="grid gap-3 md:grid-cols-6">
        {phases.map((phase, index) => (
          <div key={phase.key} className="relative min-w-0">
            {index < phases.length - 1 ? (
              <div className="pointer-events-none absolute left-[calc(100%-0.25rem)] top-[1rem] hidden h-px w-[calc(100%+0.5rem)] bg-white/10 md:block" />
            ) : null}
            <div
              className={cn(
                "rounded-[1rem] border px-3 py-3 transition-colors duration-300",
                phase.state === "active"
                  ? "border-sky-400/18 bg-sky-400/[0.07]"
                  : phase.state === "complete"
                    ? "border-emerald-400/16 bg-emerald-400/[0.05]"
                    : "border-white/8 bg-white/[0.02]",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-[10px]",
                    phase.state === "active"
                      ? "border-sky-400/30 text-sky-300"
                      : phase.state === "complete"
                        ? "border-emerald-400/25 text-emerald-300"
                        : "border-white/12 text-slate-400",
                  )}
                >
                  {phase.state === "complete" ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <div className="truncate text-sm font-medium text-white">{phase.label}</div>
              </div>
              {phase.summary ? (
                <motion.div
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-[12px] leading-5 text-slate-400"
                >
                  {phase.summary}
                </motion.div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

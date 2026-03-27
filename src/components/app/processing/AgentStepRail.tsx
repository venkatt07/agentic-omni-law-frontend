import { motion } from "framer-motion";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentRailStep {
  key: string;
  label: string;
  state: "complete" | "active" | "upcoming" | "failed";
}

function RailIcon({ state }: { state: AgentRailStep["state"] }) {
  if (state === "complete") return <Check className="h-3.5 w-3.5 text-emerald-400" />;
  if (state === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />;
  if (state === "failed") return <TriangleAlert className="h-3.5 w-3.5 text-destructive" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />;
}

interface AgentStepRailProps {
  steps: AgentRailStep[];
}

export default function AgentStepRail({ steps }: AgentStepRailProps) {
  return (
    <div className="relative max-w-[18rem]">
      <div className="absolute left-[0.24rem] top-2 bottom-2 w-px bg-white/[0.035]" />
      <div className="space-y-3.5">
        {steps.map((step, index) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.12), ease: "easeOut" }}
            className="relative flex items-center gap-3 pl-4"
          >
            <div className="absolute left-0 top-[0.36rem] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-transparent">
              <RailIcon state={step.state} />
            </div>
            <div
              className={cn(
                "text-[12px] uppercase tracking-[0.22em]",
                step.state === "active"
                  ? "font-medium text-white"
                  : step.state === "complete"
                    ? "text-slate-400/92"
                    : step.state === "failed"
                      ? "text-red-300"
                      : "text-slate-600/92",
              )}
            >
              {step.label}
              {step.state === "active" ? (
                <motion.span
                  className="pl-1 text-sky-300"
                  animate={{ opacity: [0.15, 1, 0.15] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ...
                </motion.span>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

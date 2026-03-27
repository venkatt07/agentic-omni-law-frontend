import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentRunStep {
  key: string;
  label: string;
  state: "complete" | "active" | "upcoming" | "failed";
}

function StepIcon({ state }: { state: AgentRunStep["state"] }) {
  if (state === "complete") return <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />;
  if (state === "active") return <Loader2 className="h-4.5 w-4.5 animate-spin text-sky-400" />;
  if (state === "failed") return <TriangleAlert className="h-4.5 w-4.5 text-destructive" />;
  return <Circle className="h-4.5 w-4.5 text-slate-500" />;
}

interface AgentStepListProps {
  steps: AgentRunStep[];
}

export default function AgentStepList({ steps }: AgentStepListProps) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.72),rgba(5,12,28,0.9))] p-5">
      <div className="mb-4 text-[10px] uppercase tracking-[0.26em] text-slate-400">Step-by-step work</div>
      <div className="space-y-2.5">
        {steps.map((step, index) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.12), ease: "easeOut" }}
            className={cn(
              "flex items-center gap-3 rounded-[1rem] border px-4 py-3",
              step.state === "active"
                ? "border-sky-400/18 bg-sky-400/[0.07]"
                : step.state === "complete"
                  ? "border-emerald-400/16 bg-emerald-400/[0.04]"
                  : step.state === "failed"
                    ? "border-destructive/16 bg-destructive/[0.04]"
                    : "border-white/8 bg-white/[0.02]",
            )}
          >
            <div className="shrink-0">
              <StepIcon state={step.state} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-[15px] font-medium", step.state === "upcoming" ? "text-slate-400" : "text-white")}>
                {step.label}
                {step.state === "active" ? (
                  <motion.span
                    className="inline-block pl-1 text-sky-300"
                    animate={{ opacity: [0.15, 1, 0.15] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ...
                  </motion.span>
                ) : null}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

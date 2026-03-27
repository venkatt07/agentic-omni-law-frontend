import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExecutionStage {
  key: string;
  label: string;
  state: "complete" | "active" | "upcoming";
  detail: string;
  meta?: string;
  kicker?: string;
}

interface AgentExecutionTimelineProps {
  stages: ExecutionStage[];
  activeStageKey?: string | null;
  onStageHover?: (stage: ExecutionStage | null) => void;
  onStagePin?: (stage: ExecutionStage | null) => void;
}

function StageGlyph({ state }: { state: ExecutionStage["state"] }) {
  if (state === "complete") return <Check className="h-3.5 w-3.5 text-emerald-400" />;
  if (state === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />;
}

export default function AgentExecutionTimeline({
  stages,
  activeStageKey,
  onStageHover,
  onStagePin,
}: AgentExecutionTimelineProps) {
  const activeIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.key === activeStageKey),
  );

  return (
    <div className="relative max-w-[18rem]">
      <div className="absolute left-[0.24rem] top-2 bottom-2 w-px bg-white/[0.035]" />
      <motion.div
        className="absolute left-[0.24rem] top-2 w-px bg-[linear-gradient(180deg,rgba(56,189,248,0.8),rgba(56,189,248,0.04))]"
        animate={{ height: `${Math.max(12, activeIndex * 54 + 18)}px` }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
      <div className="space-y-3.5">
        {stages.map((stage, index) => (
          <motion.button
            key={stage.key}
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.16), ease: "easeOut" }}
            onMouseEnter={() => onStageHover?.(stage)}
            onMouseLeave={() => onStageHover?.(null)}
            onFocus={() => onStageHover?.(stage)}
            onBlur={() => onStageHover?.(null)}
            onClick={() => onStagePin?.(stage)}
            className="group relative flex w-full items-center gap-3 pl-4 text-left"
          >
            <div className="absolute left-0 top-[0.36rem] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-transparent">
              <StageGlyph state={stage.state} />
            </div>
            <div
              className={cn(
                "text-[12px] uppercase tracking-[0.22em] transition-colors duration-200",
                activeStageKey === stage.key || stage.state === "active"
                  ? "font-medium text-white"
                  : stage.state === "complete"
                    ? "text-slate-400/92"
                    : "text-slate-600/92 group-hover:text-slate-400",
              )}
            >
              {stage.label}
              {stage.state === "active" ? (
                <motion.span
                  className="pl-1 text-sky-300"
                  animate={{ opacity: [0.15, 1, 0.15] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ...
                </motion.span>
              ) : null}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

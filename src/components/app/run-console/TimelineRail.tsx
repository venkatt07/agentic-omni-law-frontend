import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { RunNode } from "./useRunState";

interface TimelineRailProps {
  nodes: RunNode[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  mobile?: boolean;
  label?: string;
}

function StatusIcon({ status }: { status: RunNode["status"] }) {
  if (status === "error") return <AlertTriangle className="h-3.5 w-3.5" />;
  if (status === "done") return <Check className="h-3.5 w-3.5" />;
  return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
}

export default function TimelineRail({ nodes, selectedKey, onSelect, mobile = false, label }: TimelineRailProps) {
  const reduceMotion = useReducedMotion();
  const { t } = useI18n();

  return (
    <LayoutGroup id={mobile ? "run-stepper" : "run-rail"}>
      <nav aria-label={t("run.agentRun")}>
        <div className={cn("text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground", mobile ? "mb-3" : "mb-4")}>
          {label || t("run.pipeline")}
        </div>
        <div className={cn(
          "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          !mobile && "overflow-visible",
        )}>
          <div className={cn(
            "flex min-w-max items-center gap-2",
            !mobile && "min-w-0 flex-wrap gap-2.5",
          )}>
          {nodes.map((node) => {
            const active = node.key === selectedKey;
            return (
              <button
                key={node.key}
                type="button"
                onClick={() => onSelect(node.key)}
                className={cn(
                  "group relative rounded-full border px-3.5 py-2.5 text-left transition-colors",
                  mobile ? "text-sm" : "text-[0.95rem]",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  active
                    ? "border-black/12 bg-black/[0.04] dark:border-white/[0.12] dark:bg-white/[0.06]"
                    : "border-black/8 bg-transparent dark:border-white/[0.08]",
                )}
                aria-pressed={active}
                aria-label={`Select ${node.label}`}
              >
                {active ? (
                  <motion.span
                    layoutId="run-rail-indicator"
                    className="absolute inset-0 rounded-full bg-black/[0.04] dark:bg-white/[0.06]"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 32 }}
                  />
                ) : null}
                <span className="relative flex items-center gap-2 whitespace-nowrap">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      node.status === "error" ? "text-destructive" : node.status === "done" ? "text-emerald-500" : "text-primary",
                    )}
                  >
                    <StatusIcon status={node.status} />
                  </span>
                  <span className="truncate font-medium">{node.label}</span>
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </nav>
    </LayoutGroup>
  );
}

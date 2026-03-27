import { motion } from "framer-motion";
import { CheckCircle2, CircleDashed, Loader2, Search, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentNodeData } from "./types";

function StateIcon({ state }: { state: AgentNodeData["state"] }) {
  if (state === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (state === "failed") return <TriangleAlert className="h-4 w-4 text-destructive" />;
  if (state === "retrieving") return <Search className="h-4 w-4 text-sky-300" />;
  if (state === "reasoning" || state === "validating") return <Sparkles className="h-4 w-4 text-violet-300" />;
  if (state === "initializing") return <Loader2 className="h-4 w-4 animate-spin text-sky-300" />;
  return <CircleDashed className="h-4 w-4 text-slate-500" />;
}

function stateLabel(state: AgentNodeData["state"]) {
  if (state === "complete") return "Complete";
  if (state === "failed") return "Attention needed";
  if (state === "retrieving") return "Retrieving";
  if (state === "reasoning") return "Reasoning";
  if (state === "validating") return "Validating";
  if (state === "initializing") return "Initializing";
  return "Queued";
}

interface AgentNodeCardProps {
  node: AgentNodeData;
}

export default function AgentNodeCard({ node }: AgentNodeCardProps) {
  const active = node.state !== "queued" && node.state !== "complete" && node.state !== "failed";
  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] border p-4",
        node.emphasis === "lead" ? "min-h-[12.5rem]" : "min-h-[9rem]",
        active
          ? "border-sky-400/20 bg-[linear-gradient(180deg,rgba(14,54,108,0.2),rgba(10,24,48,0.3))]"
          : node.state === "complete"
            ? "border-emerald-400/16 bg-emerald-400/[0.04]"
            : node.state === "failed"
              ? "border-destructive/18 bg-destructive/[0.04]"
              : "border-white/8 bg-white/[0.02]",
      )}
    >
      {active ? (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit] border border-sky-400/14"
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[1rem] font-semibold tracking-[-0.02em] text-white">{node.name}</div>
            <div className="mt-1 line-clamp-2 text-[13px] leading-6 text-slate-300">{node.action}</div>
          </div>
          <div className="mt-0.5 shrink-0">
            <StateIcon state={node.state} />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{stateLabel(node.state)}</div>
            {node.detail ? <div className="mt-1 text-[12px] text-slate-400">{node.detail}</div> : null}
          </div>
          {node.evidenceCount != null && node.evidenceLabel ? (
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              {node.evidenceCount} {node.evidenceLabel}
            </div>
          ) : node.emphasis === "lead" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              <ShieldAlert className="h-3.5 w-3.5 text-sky-300" />
              Active lead
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

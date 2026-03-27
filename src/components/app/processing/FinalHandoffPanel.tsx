import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";

interface FinalHandoffPanelProps {
  completed: boolean;
  title: string;
  summary: string;
}

export default function FinalHandoffPanel({ completed, title, summary }: FinalHandoffPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.55rem] border border-emerald-400/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(7,16,38,0.9))] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {completed ? "Ready for handoff" : "Execution summary"}
          </div>
          <div className="mt-3 text-[1.25rem] font-semibold tracking-[-0.03em] text-white">{title}</div>
          <div className="mt-2 max-w-[44rem] text-sm leading-7 text-slate-300">{summary}</div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300">
          What was done
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.section>
  );
}

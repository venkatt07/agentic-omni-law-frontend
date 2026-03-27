import { motion } from "framer-motion";
import type { ReactNode } from "react";

export interface AgentMetricItem {
  key: string;
  label: string;
  value: ReactNode;
}

interface AgentMetricStripProps {
  items: AgentMetricItem[];
}

export default function AgentMetricStrip({ items }: AgentMetricStripProps) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-4">
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.12), ease: "easeOut" }}
          className="rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.72),rgba(5,12,28,0.9))] px-4 py-3.5"
        >
          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
          <div className="mt-2 text-[1.25rem] font-semibold tracking-[-0.04em] text-white">{item.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

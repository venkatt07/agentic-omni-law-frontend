import { motion } from "framer-motion";
import type { ReactNode } from "react";

export interface InstrumentItem {
  key: string;
  label: string;
  value: ReactNode;
}

interface AgentInstrumentStripProps {
  items: InstrumentItem[];
}

export default function AgentInstrumentStrip({ items }: AgentInstrumentStripProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/8 pt-4 text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:border-white/[0.05]">
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.12), ease: "easeOut" }}
          className="flex items-center gap-2"
        >
          <span className="text-slate-800 dark:text-slate-300">{item.value}</span>
          <span className="text-slate-700/80">&middot;</span>
          <span>{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

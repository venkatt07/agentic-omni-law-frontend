import { motion } from "framer-motion";
import type { EvidenceItem } from "./types";

interface EvidenceSnapshotProps {
  items: EvidenceItem[];
}

export default function EvidenceSnapshot({ items }: EvidenceSnapshotProps) {
  return (
    <section className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.72),rgba(5,12,28,0.88))] p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-slate-400">Evidence snapshot</div>
        <div className="mt-2 text-[1.1rem] font-semibold tracking-[-0.03em] text-white">What the system has grounded so far</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.15), ease: "easeOut" }}
            className="rounded-[1rem] border border-white/8 bg-white/[0.02] px-4 py-4"
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
            <div className="mt-2 text-[1.9rem] font-semibold leading-none tracking-[-0.05em] text-white">{item.value}</div>
            {item.hint ? <div className="mt-2 text-[12px] leading-5 text-slate-400">{item.hint}</div> : null}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

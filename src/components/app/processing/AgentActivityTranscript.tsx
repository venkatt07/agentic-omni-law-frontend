import { motion } from "framer-motion";

export interface AgentTranscriptItem {
  id: string;
  tone: "info" | "success" | "warning";
  text: string;
  meta?: string;
}

interface AgentActivityTranscriptProps {
  items: AgentTranscriptItem[];
}

export default function AgentActivityTranscript({ items }: AgentActivityTranscriptProps) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(index * 0.04, 0.16), ease: "easeOut" }}
          className="pb-1 last:pb-0"
        >
          <div className="flex items-start gap-3">
            <div className="mt-[0.55rem] shrink-0">
              <span
                className={
                  item.tone === "success"
                    ? "block h-1.5 w-1.5 rounded-full bg-emerald-400/92"
                    : item.tone === "warning"
                      ? "block h-1.5 w-1.5 rounded-full bg-amber-400/92"
                      : "block h-1.5 w-1.5 rounded-full bg-sky-300/92"
                }
              />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] leading-6 text-slate-200/94">{item.text}</div>
              {item.meta ? <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-slate-600/90">{item.meta}</div> : null}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

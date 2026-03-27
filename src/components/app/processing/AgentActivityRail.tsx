import { motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Sparkles } from "lucide-react";

export interface AgentActivityItem {
  id: string;
  tone: "info" | "success" | "warning";
  text: string;
  meta?: string;
}

function IconForTone({ tone }: { tone: AgentActivityItem["tone"] }) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (tone === "warning") return <CircleAlert className="h-4 w-4 text-amber-400" />;
  return <Sparkles className="h-4 w-4 text-sky-300" />;
}

interface AgentActivityRailProps {
  items: AgentActivityItem[];
}

export default function AgentActivityRail({ items }: AgentActivityRailProps) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.72),rgba(5,12,28,0.9))] p-5">
      <div className="mb-4 text-[10px] uppercase tracking-[0.26em] text-slate-400">Live activity</div>
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.16), ease: "easeOut" }}
            className="rounded-[1rem] border border-white/8 bg-white/[0.02] px-3.5 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <IconForTone tone={item.tone} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] leading-6 text-slate-200">{item.text}</div>
                {item.meta ? <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.meta}</div> : null}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

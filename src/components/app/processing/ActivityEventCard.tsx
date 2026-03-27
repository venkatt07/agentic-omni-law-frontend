import { motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Info, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "./types";

function toneIcon(tone: ActivityEvent["tone"]) {
  if (tone === "completion") return Scale;
  if (tone === "success") return CheckCircle2;
  if (tone === "warning") return CircleAlert;
  if (tone === "validation") return ShieldCheck;
  return Info;
}

function toneClass(tone: ActivityEvent["tone"]) {
  if (tone === "success") return "border-emerald-400/16 bg-emerald-400/[0.05]";
  if (tone === "warning") return "border-amber-400/18 bg-amber-400/[0.05]";
  if (tone === "validation") return "border-violet-400/18 bg-violet-400/[0.05]";
  if (tone === "completion") return "border-sky-400/18 bg-sky-400/[0.05]";
  return "border-white/8 bg-white/[0.02]";
}

interface ActivityEventCardProps {
  event: ActivityEvent;
  index: number;
}

export default function ActivityEventCard({ event, index }: ActivityEventCardProps) {
  const Icon = toneIcon(event.tone);
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.16), ease: "easeOut" }}
      className={cn("rounded-[1rem] border p-3", toneClass(event.tone))}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
          <Icon className="h-4 w-4 text-sky-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-white">{event.agent}</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{event.meta}</span>
          </div>
          <div className="mt-1 text-[13px] leading-6 text-slate-300">{event.summary}</div>
          {event.chips?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {event.chips.map((chip) => (
                <div key={chip} className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                  <Sparkles className="h-3 w-3 text-violet-300" />
                  {chip}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

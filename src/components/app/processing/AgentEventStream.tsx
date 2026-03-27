import { motion } from "framer-motion";

export interface RuntimeEvent {
  id: string;
  text: string;
  meta: string;
  detail: string;
  kicker?: string;
  stageKey?: string;
  marker: "info" | "success" | "live";
}

interface AgentEventStreamProps {
  events: RuntimeEvent[];
  activeEventId?: string | null;
  onEventHover?: (event: RuntimeEvent | null) => void;
  onEventPin?: (event: RuntimeEvent | null) => void;
}

export default function AgentEventStream({
  events,
  activeEventId,
  onEventHover,
  onEventPin,
}: AgentEventStreamProps) {
  return (
    <div className="space-y-5">
      {events.map((event, index) => (
        <motion.button
          key={event.id}
          type="button"
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.2), ease: "easeOut" }}
          onMouseEnter={() => onEventHover?.(event)}
          onMouseLeave={() => onEventHover?.(null)}
          onFocus={() => onEventHover?.(event)}
          onBlur={() => onEventHover?.(null)}
          onClick={() => onEventPin?.(event)}
          className="group block w-full text-left"
        >
          <div className="flex items-start gap-3">
            <span
              className={
                event.marker === "live"
                  ? "mt-[0.6rem] h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.58)]"
                  : event.marker === "success"
                    ? "mt-[0.6rem] h-1.5 w-1.5 rounded-full bg-emerald-400"
                    : "mt-[0.6rem] h-1.5 w-1.5 rounded-full bg-slate-500"
              }
            />
            <div className="min-w-0">
              <div className="text-[13px] leading-6 text-slate-300/92 transition-colors duration-200 group-hover:text-white">
                {event.text}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-slate-600/90">{event.meta}</div>
              {activeEventId === event.id ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="mt-2 max-w-[16rem] border-l border-white/[0.05] pl-3 text-[12px] leading-6 text-slate-400/88"
                >
                  {event.detail}
                </motion.div>
              ) : null}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

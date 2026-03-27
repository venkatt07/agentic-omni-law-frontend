import { AnimatePresence, motion } from "framer-motion";

export interface InspectorFocus {
  title: string;
  detail: string;
  meta?: string;
  kicker?: string;
}

interface AgentContextInspectorProps {
  focus: InspectorFocus | null;
}

export default function AgentContextInspector({ focus }: AgentContextInspectorProps) {
  return (
    <AnimatePresence mode="wait">
      {focus ? (
        <motion.div
          key={focus.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="px-4 py-3 backdrop-blur-sm"
        >
          {focus.kicker ? (
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-600/90">{focus.kicker}</div>
          ) : null}
          <div className="mt-1 text-sm font-medium text-white/95">{focus.title}</div>
          <div className="mt-1.5 text-[12px] leading-6 text-slate-300/88">{focus.detail}</div>
          {focus.meta ? <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-600/90">{focus.meta}</div> : null}
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-slate-600/90 backdrop-blur-sm"
        >
          Inspect stage, signal, or event
        </motion.div>
      )}
    </AnimatePresence>
  );
}

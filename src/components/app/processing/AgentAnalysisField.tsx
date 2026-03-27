import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnalysisSignal {
  id: string;
  label: string;
  detail: string;
  kicker?: string;
  meta?: string;
  state: "complete" | "active" | "upcoming";
  x: number;
  y: number;
}

interface AgentAnalysisFieldProps {
  signals: AnalysisSignal[];
  activeStageKey?: string;
  focusedSignalId?: string | null;
  onSignalHover?: (signal: AnalysisSignal | null) => void;
  onSignalPin?: (signal: AnalysisSignal | null) => void;
}

export default function AgentAnalysisField({
  signals,
  activeStageKey,
  focusedSignalId,
  onSignalHover,
  onSignalPin,
}: AgentAnalysisFieldProps) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 70, damping: 18, mass: 0.7 });
  const springY = useSpring(pointerY, { stiffness: 70, damping: 18, mass: 0.7 });
  const fieldX = useTransform(springX, (v) => v * 0.2);
  const fieldY = useTransform(springY, (v) => v * 0.18);

  return (
    <div
      className="relative flex h-[33rem] w-full items-center justify-center"
      onPointerMove={(event) => {
        if (reduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 48);
        pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 38);
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
        onSignalHover?.(null);
      }}
    >
      <motion.div
        style={reduceMotion ? undefined : { x: fieldX, y: fieldY }}
        className="relative h-[29rem] w-[29rem]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(36%_36%_at_50%_50%,rgba(14,165,233,0.08),transparent_72%)]" />
        <div className="pointer-events-none absolute inset-0 rounded-full border border-white/[0.03]" />
        <motion.div
          className="pointer-events-none absolute inset-[10%] rounded-full border border-sky-400/[0.07]"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={reduceMotion ? undefined : { duration: 24, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="pointer-events-none absolute inset-[22%] rounded-full border border-violet-400/[0.07]"
          animate={reduceMotion ? undefined : { rotate: -360 }}
          transition={reduceMotion ? undefined : { duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="pointer-events-none absolute inset-[33%] rounded-full border border-white/[0.05]"
          animate={reduceMotion ? undefined : { scale: [1, 1.03, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={reduceMotion ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[12%] h-[76%] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(56,189,248,0.22),transparent)]"
          animate={reduceMotion ? undefined : { opacity: [0.15, 0.65, 0.15] }}
          transition={reduceMotion ? undefined : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {signals.map((signal, index) => {
          const isActive = signal.state === "active";
          const isComplete = signal.state === "complete";
          const isFocused = focusedSignalId === signal.id;
          const intensityClass = isActive
            ? "bg-sky-300 shadow-[0_0_22px_rgba(56,189,248,0.7)]"
            : isComplete
              ? "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.38)]"
              : "bg-slate-500/75";

          return (
            <motion.div
              key={`trace-${signal.id}`}
              className="pointer-events-none absolute left-1/2 top-1/2 origin-center"
              style={{
                width: `${Math.hypot((signal.x - 50) * 2.9, (signal.y - 50) * 2.9)}px`,
                transform: `translate(-50%, -50%) rotate(${Math.atan2(signal.y - 50, signal.x - 50) * (180 / Math.PI)}deg)`,
              }}
              animate={{
                opacity: signal.id === activeStageKey || isFocused ? 0.6 : signal.state === "complete" ? 0.28 : 0.12,
              }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(56,189,248,0.22),transparent)]" />
            </motion.div>
          );
        })}

        {signals.map((signal, index) => {
          const isActive = signal.state === "active";
          const isComplete = signal.state === "complete";
          const isFocused = focusedSignalId === signal.id;
          const intensityClass = isActive
            ? "bg-sky-300 shadow-[0_0_22px_rgba(56,189,248,0.7)]"
            : isComplete
              ? "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.38)]"
              : "bg-slate-500/75";

          return (
            <motion.button
              key={signal.id}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: signal.state === "upcoming" ? 0.55 : 1, scale: isFocused ? 1.12 : 1 }}
              transition={{ duration: 0.28, delay: Math.min(index * 0.05, 0.18), ease: "easeOut" }}
              onMouseEnter={() => onSignalHover?.(signal)}
              onMouseLeave={() => onSignalHover?.(null)}
              onFocus={() => onSignalHover?.(signal)}
              onBlur={() => onSignalHover?.(null)}
              onClick={() => onSignalPin?.(signal)}
              className={cn(
                "group absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none",
                signal.id === activeStageKey && "scale-105",
              )}
              style={{ left: `${signal.x}%`, top: `${signal.y}%` }}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full transition-all duration-200", intensityClass)} />
              <span className="pointer-events-none absolute inset-0 rounded-full border border-white/[0.035] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
              {(isFocused || signal.id === activeStageKey) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute left-1/2 top-[-1.35rem] -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-slate-400"
                >
                  {signal.label}
                </motion.span>
              )}
            </motion.button>
          );
        })}

        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 flex h-[7.4rem] w-[7.4rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_34%,rgba(56,189,248,0.13),rgba(37,99,235,0.06)_46%,rgba(15,23,42,0.14)_74%)] shadow-[0_0_80px_rgba(14,165,233,0.12)]"
          animate={reduceMotion ? undefined : { scale: [1, 1.025, 1], opacity: [0.92, 1, 0.92] }}
          transition={reduceMotion ? undefined : { duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="h-[2.65rem] w-[2.65rem] rounded-full border-[2px] border-white/8 border-t-sky-300"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={reduceMotion ? undefined : { duration: 3.4, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

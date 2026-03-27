import { useEffect, useMemo, useState } from "react";

interface UseTypewriterHintOptions {
  hints: string[];
  isFocused: boolean;
  hasUserValue: boolean;
  typeSpeedMs?: number;
  holdMs?: number;
  deleteSpeedMs?: number;
  deleteHoldMs?: number;
}

export function useTypewriterHint({
  hints,
  isFocused,
  hasUserValue,
  typeSpeedMs = 22,
  holdMs = 1100,
  deleteSpeedMs = 14,
  deleteHoldMs = 320,
}: UseTypewriterHintOptions) {
  const safeHints = useMemo(
    () => (hints.length > 0 ? hints : ["Describe your legal issue to get started."]),
    [hints],
  );
  const [hintIndex, setHintIndex] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing");
  const paused = isFocused || hasUserValue;
  const currentHint = safeHints[hintIndex % safeHints.length];

  useEffect(() => {
    setHintIndex(0);
    setTypedCount(0);
    setPhase("typing");
  }, [safeHints]);

  useEffect(() => {
    if (paused) return;
    if (phase === "typing") {
      if (typedCount < currentHint.length) {
        const timer = window.setTimeout(() => setTypedCount((value) => value + 1), typeSpeedMs);
        return () => window.clearTimeout(timer);
      }
      const timer = window.setTimeout(() => setPhase("holding"), holdMs);
      return () => window.clearTimeout(timer);
    }

    if (phase === "holding") {
      const timer = window.setTimeout(() => setPhase("deleting"), deleteHoldMs);
      return () => window.clearTimeout(timer);
    }

    if (typedCount > 0) {
      const timer = window.setTimeout(() => setTypedCount((value) => value - 1), deleteSpeedMs);
      return () => window.clearTimeout(timer);
    }

    setHintIndex((value) => (value + 1) % safeHints.length);
    setPhase("typing");
    return;
  }, [currentHint, deleteHoldMs, deleteSpeedMs, holdMs, paused, phase, safeHints.length, typeSpeedMs, typedCount]);

  return {
    paused,
    currentHint,
    renderedHint: currentHint.slice(0, typedCount),
    hintIndex,
    typedCount,
    phase,
  };
}

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface RouteTransitionFrameProps {
  routeKey: string;
  children: ReactNode;
  className?: string;
}

export default function RouteTransitionFrame({ routeKey, children, className }: RouteTransitionFrameProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div data-testid="route-transition-shell" className={className}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        data-testid="route-transition-shell"
        className={className}
        initial={{ opacity: 0, y: 18, scale: 0.992, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, scale: 0.996, filter: "blur(7px)" }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200, transformOrigin: "50% 8%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

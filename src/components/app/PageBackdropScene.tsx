import type { CSSProperties, RefObject } from "react";
import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { getRoleBackdropVars } from "@/theme/tokens";

export default function PageBackdropScene({
  className,
  style: customStyle,
  scrollContainerRef,
}: {
  className?: string;
  style?: CSSProperties;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}) {
  const role = useAppStore((state) => state.selectedRole);
  const reduceMotion = useReducedMotion();
  const style = { ...(getRoleBackdropVars(role) as CSSProperties), ...customStyle };
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const scrollY = useMotionValue(0);
  const pointerXSpring = useSpring(pointerX, { stiffness: 45, damping: 18, mass: 0.8 });
  const pointerYSpring = useSpring(pointerY, { stiffness: 45, damping: 18, mass: 0.8 });
  const pointerXInverse = useSpring(pointerX, { stiffness: 36, damping: 16, mass: 0.85 });
  const pointerYInverse = useSpring(pointerY, { stiffness: 36, damping: 16, mass: 0.85 });
  const scrollSpring = useSpring(scrollY, { stiffness: 40, damping: 20, mass: 0.9 });
  const upperFieldY = useTransform(scrollSpring, (value) => value * -0.08);
  const lowerFieldY = useTransform(scrollSpring, (value) => value * 0.05);
  const beamY = useTransform(scrollSpring, (value) => value * -0.03);
  const beamRotate = useTransform(pointerXSpring, (value) => value * 0.18);
  const gridOpacity = useTransform(scrollSpring, (value) => 0.22 + Math.min(0.18, value / 4000));
  const parallaxX = useTransform(pointerXSpring, (value) => value * 0.7);
  const parallaxY = useTransform(pointerYSpring, (value) => value * 0.7);
  const lowerParallaxX = useTransform(pointerXInverse, (value) => value * 0.5);
  const lowerParallaxY = useTransform(pointerYInverse, (value) => value * 0.4);

  useEffect(() => {
    if (reduceMotion || typeof window === "undefined") return;
    const handlePointerMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 48;
      const y = (event.clientY / window.innerHeight - 0.5) * 34;
      pointerX.set(x);
      pointerY.set(y);
    };
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("mousemove", handlePointerMove);
  }, [pointerX, pointerY, reduceMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const element = scrollContainerRef?.current || null;
    const update = () => {
      scrollY.set(element ? element.scrollTop : window.scrollY);
    };
    update();
    const target: HTMLElement | Window = element || window;
    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update as EventListener);
  }, [scrollContainerRef, scrollY]);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={style}
    >
      <div className="absolute inset-0 bg-[#fef3ea] dark:bg-[#030405]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,244,235,0.46),rgba(234,244,255,0.38)_42%,rgba(252,234,245,0.42)),radial-gradient(34rem_26rem_at_12%_18%,rgba(251,191,36,0.42),transparent_56%),radial-gradient(34rem_26rem_at_86%_16%,rgba(59,130,246,0.42),transparent_58%),radial-gradient(30rem_24rem_at_50%_48%,rgba(168,85,247,0.34),transparent_56%),radial-gradient(36rem_26rem_at_50%_100%,rgba(236,72,153,0.28),transparent_70%)] dark:bg-[linear-gradient(180deg,rgba(4,5,7,0.76),rgba(7,8,10,0.98))]" />
      <div className="light-float-a absolute left-[-8%] top-[8%] h-[24rem] w-[24rem] rounded-[42%] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.62),rgba(56,189,248,0.18)_58%,transparent_74%)] blur-[56px] dark:hidden" />
      <div className="light-float-b absolute right-[-4%] top-[18%] h-[28rem] w-[28rem] rounded-[46%] bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.56),rgba(250,204,21,0.16)_56%,transparent_74%)] blur-[64px] dark:hidden" />
      <div className="light-float-c absolute left-[18%] bottom-[-8%] h-[26rem] w-[26rem] rounded-[38%] bg-[radial-gradient(circle_at_50%_50%,rgba(244,114,182,0.44),rgba(244,114,182,0.14)_58%,transparent_74%)] blur-[58px] dark:hidden" />
      <div className="light-float-b absolute right-[20%] top-[34%] h-[22rem] w-[22rem] rounded-[44%] bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.42),rgba(168,85,247,0.12)_58%,transparent_74%)] blur-[52px] dark:hidden" />
      <div className="light-float-a absolute left-[34%] top-[18%] h-[18rem] w-[18rem] rounded-[46%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_56%,transparent_72%)] blur-[44px] dark:hidden" />
      <motion.div
        style={reduceMotion ? undefined : { x: parallaxX, y: upperFieldY }}
        className="absolute left-[-14rem] top-[-15rem] h-[38rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.28),transparent_72%)] blur-[132px] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(var(--tb-a),0.18),transparent_72%)]"
        animate={reduceMotion ? undefined : { x: [0, 18, -10, 0], y: [0, 16, -9, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={reduceMotion ? undefined : { x: lowerParallaxX, y: lowerFieldY }}
        className="absolute right-[-10rem] top-[8%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.3),transparent_74%)] blur-[128px] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(var(--tb-b),0.17),transparent_74%)]"
        animate={reduceMotion ? undefined : { x: [0, -16, 10, 0], y: [0, 10, -6, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={reduceMotion ? undefined : { y: beamY, rotate: beamRotate }}
        className="absolute left-[12%] top-[4%] h-[15rem] w-[50%] rounded-full bg-[conic-gradient(from_220deg_at_50%_50%,rgba(236,72,153,0),rgba(236,72,153,0.22),rgba(59,130,246,0.18),rgba(236,72,153,0))] opacity-80 blur-[52px] dark:bg-[conic-gradient(from_220deg_at_50%_50%,rgba(var(--tb-line-a),0),rgba(var(--tb-line-a),0.12),rgba(var(--tb-line-b),0.08),rgba(var(--tb-line-a),0))]"
        animate={reduceMotion ? undefined : { x: [0, 16, -10, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={reduceMotion ? undefined : { x: parallaxX, y: parallaxY }}
        className="absolute right-[10%] top-[10%] h-52 w-52 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.56),transparent_68%)] opacity-80 blur-3xl dark:bg-[radial-gradient(circle_at_50%_50%,rgba(148,163,184,0.08),transparent_68%)] dark:opacity-90"
      />
      <motion.div
        style={reduceMotion ? undefined : { opacity: gridOpacity }}
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--app-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--app-grid)_1px,transparent_1px)] bg-[size:44px_44px]"
      />
      <motion.div
        style={reduceMotion ? undefined : { x: lowerParallaxX, y: lowerParallaxY }}
        className="absolute left-[14%] top-[24%] h-[22rem] w-[22rem] rounded-full border border-black/4 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.5),transparent_66%)] opacity-40 blur-2xl dark:border-white/5 dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_66%)] dark:opacity-90"
      />
      <div className="absolute inset-0 bg-[radial-gradient(72%_38%_at_50%_0%,rgba(255,255,255,0.34),transparent_68%)] dark:bg-[radial-gradient(72%_38%_at_50%_0%,rgba(255,255,255,0.04),transparent_68%)]" />
      <div className="absolute inset-0 opacity-[0.01] dark:opacity-[0.016] bg-[repeating-radial-gradient(circle_at_20%_18%,rgba(15,23,42,0.65)_0_0.5px,transparent_0.5px_5px),repeating-radial-gradient(circle_at_78%_72%,rgba(15,23,42,0.35)_0_0.45px,transparent_0.45px_3.8px)]" />
      <motion.div
        style={reduceMotion ? undefined : { x: lowerParallaxX, y: pointerYInverse }}
        className="absolute inset-0 bg-[radial-gradient(26rem_18rem_at_68%_24%,rgba(168,85,247,0.3),transparent_72%),radial-gradient(24rem_16rem_at_28%_76%,rgba(236,72,153,0.22),transparent_74%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%)] dark:bg-[radial-gradient(26rem_18rem_at_68%_24%,rgba(255,255,255,0.035),transparent_72%),radial-gradient(24rem_16rem_at_28%_76%,rgba(161,161,170,0.04),transparent_74%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_38%)]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(closest-side_at_50%_36%,transparent_0%,transparent_64%,rgba(15,23,42,0.012)_84%,rgba(15,23,42,0.028)_100%)] dark:bg-[radial-gradient(closest-side_at_50%_36%,transparent_0%,transparent_54%,rgba(0,0,0,0.18)_80%,rgba(0,0,0,0.3)_100%)]" />
    </div>
  );
}

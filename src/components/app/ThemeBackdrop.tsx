import { type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { getRoleBackdropVars } from "@/theme/tokens";

interface ThemeBackdropProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "minimal";
}

export default function ThemeBackdrop({
  children,
  className,
  contentClassName,
  variant = "default",
}: ThemeBackdropProps) {
  const role = useAppStore((state) => state.selectedRole);
  const reduceMotion = useReducedMotion();
  const style = getRoleBackdropVars(role) as CSSProperties;

  return (
    <div className={cn("relative overflow-hidden rounded-[1.75rem] p-5 md:p-6", className)} style={style}>
      <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[#fef3ea] dark:bg-[#040506]" />
      <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(255,244,235,0.42),rgba(233,243,255,0.36)_42%,rgba(252,233,245,0.38)),radial-gradient(24rem_18rem_at_12%_14%,rgba(251,191,36,0.34),transparent_56%),radial-gradient(24rem_18rem_at_88%_14%,rgba(59,130,246,0.32),transparent_56%),radial-gradient(20rem_16rem_at_50%_52%,rgba(168,85,247,0.26),transparent_54%),radial-gradient(24rem_18rem_at_50%_100%,rgba(236,72,153,0.24),transparent_66%)] dark:bg-[linear-gradient(180deg,#050607_0%,#090a0d_42%,#060709_100%)]" />
      <div className="light-float-a pointer-events-none absolute left-[-10%] top-[2%] h-[14rem] w-[14rem] rounded-[40%] bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.34),rgba(59,130,246,0.1)_60%,transparent_76%)] blur-[40px] dark:hidden" />
      <div className="light-float-b pointer-events-none absolute right-[-4%] top-[8%] h-[16rem] w-[16rem] rounded-[44%] bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.32),rgba(250,204,21,0.08)_58%,transparent_74%)] blur-[42px] dark:hidden" />
      <div className="light-float-c pointer-events-none absolute left-[32%] bottom-[-10%] h-[14rem] w-[14rem] rounded-[44%] bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.26),rgba(236,72,153,0.08)_58%,transparent_74%)] blur-[38px] dark:hidden" />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-16 h-[18rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(251,191,36,0.26),rgba(251,191,36,0.08)_42%,transparent_76%)] blur-[70px] md:blur-[90px] dark:bg-[radial-gradient(circle_at_35%_35%,rgba(var(--tb-a),0.22),rgba(var(--tb-a),0.1)_42%,transparent_76%)]"
        animate={reduceMotion || variant === "minimal" ? undefined : { x: [0, 12, -5, 0], y: [0, 8, -4, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-7rem] top-[-4rem] h-[18rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_60%_36%,rgba(59,130,246,0.24),rgba(59,130,246,0.08)_42%,transparent_78%)] blur-[78px] md:blur-[96px] dark:bg-[radial-gradient(circle_at_60%_36%,rgba(var(--tb-b),0.2),rgba(var(--tb-b),0.08)_42%,transparent_78%)]"
        animate={reduceMotion || variant === "minimal" ? undefined : { x: [0, -10, 4, 0], y: [0, 6, -4, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(24rem_16rem_at_74%_18%,rgba(59,130,246,0.24),transparent_70%),radial-gradient(26rem_18rem_at_24%_76%,rgba(236,72,153,0.2),transparent_72%),radial-gradient(18rem_14rem_at_50%_48%,rgba(168,85,247,0.22),transparent_58%)] dark:bg-[radial-gradient(24rem_16rem_at_74%_18%,rgba(255,255,255,0.04),transparent_70%),radial-gradient(26rem_18rem_at_24%_76%,rgba(161,161,170,0.05),transparent_72%)]"
      />
      {variant === "default" ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(72%_48%_at_50%_8%,rgba(255,255,255,0.42),rgba(255,255,255,0.12)_42%,transparent_82%)] dark:bg-[radial-gradient(72%_48%_at_50%_8%,rgba(255,255,255,0.035),rgba(255,255,255,0.02)_42%,transparent_82%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[linear-gradient(to_right,rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(92%_76%_at_50%_38%,black_28%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-[4.5%] rounded-[1.5rem] shadow-[0_0_0_1px_rgba(255,255,255,0.38),0_18px_44px_rgba(59,130,246,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_56px_rgba(2,6,23,0.38)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(closest-side_at_50%_44%,transparent_0%,rgba(0,0,0,0)_66%,rgba(0,0,0,0.03)_84%,rgba(0,0,0,0.06)_100%)] dark:bg-[radial-gradient(closest-side_at_50%_44%,transparent_0%,rgba(0,0,0,0)_56%,rgba(0,0,0,0.12)_80%,rgba(0,0,0,0.24)_100%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/50 dark:border-white/5" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(72%_48%_at_50%_8%,rgba(255,255,255,0.24),transparent_82%)] dark:bg-[radial-gradient(72%_48%_at_50%_8%,rgba(255,255,255,0.02),transparent_82%)]" />
        </>
      )}

      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}

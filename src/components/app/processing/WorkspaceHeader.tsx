import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Clock3, Scale, ShieldCheck, Sparkles } from "lucide-react";

interface WorkspaceHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  caseTitle?: string;
  jurisdiction?: string;
  domain?: string;
  phaseLabel?: string;
  elapsedLabel?: string;
  progressPct: number;
  statusPill?: string;
  action?: ReactNode;
}

export default function WorkspaceHeader({
  eyebrow,
  title,
  subtitle,
  caseTitle,
  jurisdiction,
  domain,
  phaseLabel,
  elapsedLabel,
  progressPct,
  statusPill,
  action,
}: WorkspaceHeaderProps) {
  return (
    <header className="relative flex flex-col gap-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 max-w-[62rem]">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-sky-300/90">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(56,189,248,0.36),transparent)]" />
          </div>
          <h1 className="mt-5 max-w-[14ch] text-[2.7rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white md:text-[3.8rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-[58rem] text-[1rem] leading-8 text-slate-300 md:text-[1.06rem]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)]">
        <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 md:p-5">
          <div className="text-[10px] uppercase tracking-[0.26em] text-slate-400">Case workspace</div>
          <div className="mt-3 text-[1.3rem] font-semibold tracking-[-0.035em] text-white md:text-[1.55rem]">
            {caseTitle || title}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {jurisdiction ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
                <Scale className="h-3.5 w-3.5 text-sky-300" />
                {jurisdiction}
              </div>
            ) : null}
            {domain ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-violet-300" />
                {domain}
              </div>
            ) : null}
            {phaseLabel ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                {phaseLabel}
              </div>
            ) : null}
            {elapsedLabel ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300">
                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                {elapsedLabel}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-400">Overall phase</div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
                {phaseLabel || "Specialist analysis"}
              </div>
            </div>
            {statusPill ? (
              <motion.div
                className="inline-flex items-center rounded-full border border-sky-400/18 bg-sky-400/[0.08] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-200"
                animate={{ boxShadow: ["0 0 0 rgba(56,189,248,0.0)", "0 0 18px rgba(56,189,248,0.12)", "0 0 0 rgba(56,189,248,0.0)"] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                {statusPill}
              </motion.div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.24em] text-slate-400">
            <span>Workspace progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-white/10">
            <motion.div
              className={cn("h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#2563eb_58%,#7c3aed_100%)]")}
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

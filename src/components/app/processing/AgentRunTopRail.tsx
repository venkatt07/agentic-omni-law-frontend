import type { ReactNode } from "react";
import { Scale, Sparkles } from "lucide-react";

interface AgentRunTopRailProps {
  agentName: string;
  caseTitle: string;
  jurisdiction?: string;
  phaseLabel: string;
  action?: ReactNode;
}

export default function AgentRunTopRail({
  agentName,
  caseTitle,
  jurisdiction,
  phaseLabel,
  action,
}: AgentRunTopRailProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-8">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full px-0.5 py-1 text-[10px] font-medium uppercase tracking-[0.34em] text-sky-700/82 dark:text-sky-300/82">
          <Sparkles className="h-3.5 w-3.5 opacity-80" />
          {agentName}
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-3 text-[0.98rem] font-medium tracking-[-0.02em] text-slate-800/80 dark:text-white/80">
          <span className="truncate">{caseTitle}</span>
          {jurisdiction ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500/92 dark:text-slate-500/92">
              <Scale className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              {jurisdiction}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-full px-0.5 py-1 text-[10px] font-medium uppercase tracking-[0.26em] text-slate-700 dark:text-slate-200">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300/55" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300" />
          </span>
          {phaseLabel}
        </div>
        {action}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { Scale, Sparkles } from "lucide-react";

interface AgentRunHeaderProps {
  agentName: string;
  caseTitle: string;
  jurisdiction?: string;
  statusPill: string;
  action?: ReactNode;
}

export default function AgentRunHeader({
  agentName,
  caseTitle,
  jurisdiction,
  statusPill,
  action,
}: AgentRunHeaderProps) {
  return (
    <header className="mb-3 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full px-0.5 py-1 text-[10px] font-medium uppercase tracking-[0.34em] text-sky-300/82">
            <Sparkles className="h-3.5 w-3.5 opacity-80" />
            {agentName}
          </div>
          {jurisdiction ? (
            <div className="inline-flex items-center gap-2 rounded-full px-0.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500/92">
              <Scale className="h-3.5 w-3.5 text-slate-400" />
              {jurisdiction}
            </div>
          ) : null}
        </div>
        <div className="mt-5 text-[0.98rem] font-medium tracking-[-0.02em] text-white/80 md:text-[1.06rem]">
          {caseTitle}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full px-0.5 py-1 text-[10px] font-medium uppercase tracking-[0.26em] text-slate-200">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300/55" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300" />
          </span>
          {statusPill}
        </div>
        {action}
      </div>
    </header>
  );
}

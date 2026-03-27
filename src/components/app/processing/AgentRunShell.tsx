import type { ReactNode } from "react";

export default function AgentRunShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef3fb_46%,#f8f4ff_100%)] text-slate-950 dark:bg-[linear-gradient(180deg,#020308_0%,#040713_52%,#020307_100%)] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(28%_24%_at_14%_18%,rgba(251,191,36,0.11),transparent_65%),radial-gradient(26%_22%_at_84%_14%,rgba(59,130,246,0.14),transparent_58%),radial-gradient(34%_28%_at_54%_78%,rgba(217,70,239,0.09),transparent_76%)] dark:bg-[radial-gradient(32%_28%_at_18%_22%,rgba(14,165,233,0.11),transparent_62%),radial-gradient(26%_22%_at_80%_16%,rgba(59,130,246,0.1),transparent_60%),radial-gradient(32%_30%_at_48%_66%,rgba(76,29,149,0.12),transparent_74%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.028)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.028)_1px,transparent_1px)] bg-[size:104px_104px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(56%_40%_at_50%_0%,rgba(255,255,255,0.32),transparent_78%)] dark:bg-[radial-gradient(56%_40%_at_50%_0%,rgba(255,255,255,0.04),transparent_78%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[88rem] flex-col px-4 py-5 md:px-6 md:py-6 xl:px-8">
        {children}
      </div>
    </div>
  );
}

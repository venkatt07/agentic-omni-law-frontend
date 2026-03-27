import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface AgentRunHeroProps {
  title: string;
  sentence: string;
}

export default function AgentRunHero({ title, sentence }: AgentRunHeroProps) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.82),rgba(5,12,28,0.92))] p-6 md:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_11rem] lg:items-center">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Selected agent</div>
          <h1 className="mt-3 max-w-[12ch] text-[2.6rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white md:text-[4rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-[42rem] text-[1rem] leading-8 text-slate-300 md:text-[1.06rem]">
            {sentence}
          </p>
        </div>
        <div className="flex justify-start lg:justify-center">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.2),rgba(15,23,42,0.42))] shadow-[0_24px_48px_-28px_rgba(37,99,235,0.4)]">
            <motion.div
              className="absolute inset-[-18px] rounded-[2.5rem] border border-sky-400/12"
              animate={{ scale: [1, 1.06, 1], opacity: [0.38, 0.72, 0.38] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <Loader2 className="h-10 w-10 animate-spin text-sky-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

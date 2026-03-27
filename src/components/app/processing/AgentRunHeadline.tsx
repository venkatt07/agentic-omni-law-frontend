interface AgentRunHeadlineProps {
  headline: string;
  sentence: string;
}

export default function AgentRunHeadline({ headline, sentence }: AgentRunHeadlineProps) {
  return (
    <div className="max-w-[32rem]">
      <h1 className="text-[3rem] font-semibold leading-[0.88] tracking-[-0.08em] text-white md:text-[4.8rem]">
        {headline}
      </h1>
      <p className="mt-3 max-w-[25rem] text-[0.98rem] leading-7 text-slate-300/92 md:text-[1rem]">
        {sentence}
      </p>
    </div>
  );
}

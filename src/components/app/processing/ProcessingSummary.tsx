import type { SummaryItem } from "./types";

interface ProcessingSummaryProps {
  items: SummaryItem[];
  footerNote?: string;
}

export default function ProcessingSummary({ items, footerNote }: ProcessingSummaryProps) {
  return (
    <section className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.72),rgba(5,12,28,0.88))] p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-slate-400">Processing summary</div>
        <div className="mt-2 text-[1.1rem] font-semibold tracking-[-0.03em] text-white">Current legal-work status</div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-[1rem] border border-white/8 bg-white/[0.02] px-4 py-3">
            <div>
              <div className="text-sm text-slate-400">{item.label}</div>
              {item.hint ? <div className="mt-1 text-[12px] text-slate-500">{item.hint}</div> : null}
            </div>
            <div className="max-w-[13rem] text-right text-sm font-medium text-white">{item.value}</div>
          </div>
        ))}
      </div>
      {footerNote ? (
        <div className="mt-4 border-t border-white/8 pt-4 text-[12px] leading-6 text-slate-400">
          {footerNote}
        </div>
      ) : null}
    </section>
  );
}

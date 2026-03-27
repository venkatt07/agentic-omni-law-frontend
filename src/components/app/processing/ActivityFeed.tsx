import ActivityEventCard from "./ActivityEventCard";
import type { ActivityEvent } from "./types";

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.72),rgba(5,12,28,0.92))] p-5 shadow-[0_28px_78px_-56px_rgba(2,6,23,0.78)]">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-slate-400">Live activity feed</div>
        <div className="mt-2 text-[1.2rem] font-semibold tracking-[-0.03em] text-white">Visible work as the case progresses</div>
      </div>
      <div className="grid gap-3">
        {events.map((event, index) => (
          <ActivityEventCard key={event.id} event={event} index={index} />
        ))}
      </div>
    </section>
  );
}

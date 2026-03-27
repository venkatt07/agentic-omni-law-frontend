import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ActivityStream from "./ActivityStream";
import type { RunLogLine } from "./useRunState";

interface EvidenceDrawerProps {
  logs: RunLogLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile?: boolean;
  elapsedLabel?: string;
}

function SidebarContent({
  logs,
  elapsedLabel,
}: {
  logs: RunLogLine[];
  elapsedLabel?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
      <div className="min-w-0 min-h-0 h-full flex-1 overflow-hidden pr-3 pb-8">
        <ActivityStream lines={logs} compact elapsedLabel={elapsedLabel} />
      </div>
    </div>
  );
}

export default function EvidenceDrawer({
  logs,
  open,
  onOpenChange,
  mobile = false,
  elapsedLabel,
}: EvidenceDrawerProps) {
  if (mobile) {
    return (
      <section className="border-t border-black/6 pt-6 dark:border-white/[0.08]">
        <SidebarContent logs={logs} elapsedLabel={elapsedLabel} />
      </section>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-[width,padding,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        open
          ? "w-[18rem] border-l border-black/6 bg-black/[0.02] pl-3 pt-0 dark:border-white/[0.08] dark:bg-white/[0.015] xl:w-[19rem] 2xl:w-[21rem]"
          : "w-auto border-0 bg-transparent pl-0",
      )}
    >
      <div className={cn("mb-0 flex shrink-0 items-center gap-3", open ? "justify-between pr-3" : "justify-center")}>
        {open ? <div /> : null}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-full",
            !open && "border border-black/10 bg-white/90 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/[0.12] dark:bg-black/60",
          )}
          onClick={() => onOpenChange(!open)}
          aria-label={open ? "Collapse run activity sidebar" : "Expand run activity sidebar"}
        >
          {open ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>
      {open ? (
        <SidebarContent logs={logs} elapsedLabel={elapsedLabel} />
      ) : null}
    </aside>
  );
}

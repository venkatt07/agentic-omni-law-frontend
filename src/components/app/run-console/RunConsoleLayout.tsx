import { motion, useReducedMotion } from "framer-motion";
import TimelineRail from "./TimelineRail";
import ActiveAgentConsole from "./ActiveAgentConsole";
import EvidenceDrawer from "./EvidenceDrawer";
import type { ReturnTypeUseRunState } from "./types";
import { AlertTriangle } from "lucide-react";

interface RunConsoleLayoutProps {
  state: ReturnTypeUseRunState;
}

export default function RunConsoleLayout({ state }: RunConsoleLayoutProps) {
  const reduceMotion = useReducedMotion();
  const railOpen = state.evidenceOpen;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className="h-screen w-full overflow-hidden"
    >
      <div className="h-full w-full px-3 py-3 md:px-4 md:py-4 xl:px-5">
        <div className="relative flex h-full max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-black/8 bg-white/86 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/42 dark:shadow-[0_24px_90px_-48px_rgba(0,0,0,0.68)] md:max-h-[calc(100vh-2rem)]">
          <div className="shrink-0 border-b border-black/6 px-4 py-3 dark:border-white/[0.08] md:px-6 md:py-4">
            <TimelineRail
              nodes={state.nodes}
              selectedKey={state.selectedKey}
              onSelect={state.setSelectedKey}
              mobile
              label={state.railLabel}
            />
          </div>

          {!railOpen ? (
            <div className="absolute right-4 top-[6.75rem] z-20 hidden lg:block">
              <EvidenceDrawer
                logs={state.logs}
                open={false}
                onOpenChange={state.setEvidenceOpen}
                elapsedLabel={state.elapsedLabel}
              />
            </div>
          ) : null}

          <div className={railOpen ? "grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]" : "grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)]"}>
            <div className="min-h-0 min-w-0 overflow-hidden px-4 py-4 md:px-6 md:py-4">
              <div className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-50/92 px-4 py-3 text-left shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Keep this page open while the run is active</div>
                    <div className="mt-1 text-sm leading-6 text-amber-800/90 dark:text-amber-100/80">
                      Leaving this screen interrupts the live progress view. Stay here until the report is ready to avoid losing this step in the current flow.
                    </div>
                  </div>
                </div>
              </div>
              <ActiveAgentConsole
                caseTitle={state.caseTitle}
                statusLabel={state.statusLabel}
                elapsedLabel={state.elapsedLabel}
                subtitle={state.subtitle}
                overallProgress={state.overallProgress}
                footerNote={state.footerNote}
                action={state.action}
                runType={state.runType}
                nodes={state.nodes}
                node={state.selectedNode}
                reportHref={state.reportHref}
              />

              <div className="mt-6 lg:hidden">
                <EvidenceDrawer
                  logs={state.logs}
                  open
                  onOpenChange={() => undefined}
                  mobile
                  elapsedLabel={state.elapsedLabel}
                />
              </div>
            </div>

            {railOpen ? (
              <div className="hidden min-h-0 overflow-hidden border-l border-black/6 px-0 pt-0 pb-4 dark:border-white/[0.08] lg:flex lg:flex-col">
                <EvidenceDrawer
                  logs={state.logs}
                  open={state.evidenceOpen}
                  onOpenChange={state.setEvidenceOpen}
                  elapsedLabel={state.elapsedLabel}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

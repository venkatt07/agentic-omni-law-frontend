import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ClickableCard from "@/components/app/ClickableCard";
import { useAppStore } from "@/store";
import { caseService, type CaseSummaryResponse } from "@/services/caseService";

export default function CaseContextBanner() {
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const casesById = useAppStore((state) => state.casesById);
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableCases, setAvailableCases] = useState<CaseSummaryResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!open) return;
    setLoading(true);
    caseService
      .listCases()
      .then((rows) => {
        if (!cancelled) setAvailableCases(rows);
      })
      .catch(() => {
        if (!cancelled) setAvailableCases([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const fallbackCases = useMemo(
    () =>
      Object.values(casesById).map((item) => ({
        case_id: item.caseId,
        title: item.title,
        domain: item.domain,
        updated_at: item.updatedAt,
        last_run_status: null,
      })),
    [casesById],
  );
  const cases = availableCases.length ? availableCases : fallbackCases;
  const activeTitle = useMemo(
    () => cases.find((item) => item.case_id === activeCaseId)?.title || "Current Case Workspace",
    [activeCaseId, cases],
  );

  return (
    <>
      <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
        <p className="text-sm text-muted-foreground">
          {activeCaseId ? (
            <>
              Using current case: <span className="font-mono text-primary">{activeCaseId}</span>. No re-upload required.
            </>
          ) : (
            <>
              No active case workspace yet.{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => setOpen(true)}>
                Select case
              </Button>
              .
            </>
          )}
        </p>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a Case Workspace</DialogTitle>
            <DialogDescription>Pick an existing backend case to continue across all agents.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {loading ? <div className="text-sm text-muted-foreground">Loading cases...</div> : null}
            {!loading && !cases.length ? <div className="text-sm text-muted-foreground">No cases available yet.</div> : null}
            {cases.map((item) => (
              <ClickableCard
                key={item.case_id}
                ariaLabel={`Select case ${item.case_id}`}
                onClick={() => {
                  setCaseWorkspace(item.case_id, item.title);
                  setOpen(false);
                }}
                className="p-3"
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.case_id}</p>
              </ClickableCard>
            ))}
            {activeCaseId ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCaseWorkspace(activeCaseId, activeTitle);
                  setOpen(false);
                }}
              >
                Keep Current Case
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

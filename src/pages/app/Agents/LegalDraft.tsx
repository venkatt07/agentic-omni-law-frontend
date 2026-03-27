import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAppStore } from "@/store";
import { authService } from "@/services/authService";
import { EmptyState, LoadingState } from "@/components/app/PageState";
import { openAgentCase } from "@/lib/agentCaseNavigation";

export default function LegalDraft() {
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      let targetCaseId = activeCaseId || "";
      if (!targetCaseId) {
        try {
          const me = await authService.me();
          targetCaseId = (me as any)?.active_case_id || "";
          if (targetCaseId) setActiveCaseId(targetCaseId);
        } catch {}
      }
      if (!cancelled && targetCaseId) {
        await openAgentCase({
          agentKey: "legal_drafts_validation",
          caseId: targetCaseId,
          setLocation,
          replace: true,
        });
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [activeCaseId, setActiveCaseId, setLocation]);

  if (!activeCaseId) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <EmptyState
          title="No active case selected"
          description="Open or create a case in Query Parsing first, then use Legal Draft Generator."
          actionLabel="Open Query Parsing"
          onAction={() => setLocation("/app/agents/query")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <LoadingState title="Opening Legal Draft Generator" description="Loading selected case..." />
    </div>
  );
}

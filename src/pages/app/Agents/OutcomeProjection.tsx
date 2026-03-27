import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAppStore } from "@/store";
import { authService } from "@/services/authService";
import { EmptyState, LoadingState } from "@/components/app/PageState";
import { useI18n } from "@/hooks/useI18n";
import { openAgentCase } from "@/lib/agentCaseNavigation";

export default function OutcomeProjection() {
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const [, setLocation] = useLocation();
  const { t } = useI18n();

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
          agentKey: "case_outcome_deadline_penalty",
          caseId: targetCaseId,
          setLocation,
          replace: true,
        });
      }
    };
    void resolve();
    return () => { cancelled = true; };
  }, [activeCaseId, setActiveCaseId, setLocation]);

  if (!activeCaseId) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <EmptyState
          title={t("agent.outcome.noActiveCase")}
          description={t("agent.outcome.noActiveCaseDescription")}
          actionLabel={t("common.openQueryParsing")}
          onAction={() => setLocation("/app/agents/query")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <LoadingState title={t("agent.outcome.opening")} description={t("common.loadingSelectedCase")} />
    </div>
  );
}

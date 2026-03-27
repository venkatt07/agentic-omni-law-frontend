import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAppStore } from "@/store";
import { authService } from "@/services/authService";
import { caseService } from "@/services/caseService";
import { EmptyState, LoadingState } from "@/components/app/PageState";
import { useState } from "react";
import { openAgentCase } from "@/lib/agentCaseNavigation";

export default function Compliance() {
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);
  const [, setLocation] = useLocation();
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled && !activeCaseId) {
        setLocation("/app/agents/query", { replace: true } as any);
      }
    }, 8000);
    const resolve = async () => {
      let targetCaseId = activeCaseId || "";
      let targetTitle = "Current Case Workspace";
      if (targetCaseId) {
        targetTitle = useAppStore.getState().casesById[targetCaseId]?.title || targetTitle;
      } else {
        try {
          const rows = await caseService.listCases();
          if (rows?.length) {
            targetCaseId = rows[0].case_id;
            targetTitle = rows[0].title || targetTitle;
          }
        } catch {}
      }
      if (!targetCaseId) {
        try {
          const me = await authService.me();
          targetCaseId = (me as any)?.active_case_id || "";
        } catch {}
      }
      if (targetCaseId) {
        setActiveCaseId(targetCaseId);
        setCaseWorkspace(targetCaseId, targetTitle);
      }
      if (!cancelled && targetCaseId) {
        await openAgentCase({
          agentKey: "policy_compliance",
          caseId: targetCaseId,
          title: targetTitle,
          setLocation,
          replace: true,
        });
      }
      if (!cancelled) setResolving(false);
    };
    void resolve();
    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, [activeCaseId, setActiveCaseId, setCaseWorkspace, setLocation]);

  if (resolving) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <LoadingState title="Opening Policy Compliance" description="Loading latest case..." />
      </div>
    );
  }

  if (!activeCaseId) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <EmptyState
          title="No active case selected"
          description="Open or create a case in Query Parsing first, then run Policy Compliance."
          actionLabel="Open Query Parsing"
          onAction={() => setLocation("/app/agents/query")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <LoadingState title="Opening Policy Compliance" description="Loading selected case..." />
    </div>
  );
}

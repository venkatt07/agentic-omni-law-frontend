import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { Clock3, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ClickableCard from "@/components/app/ClickableCard";
import { caseService } from "@/services/caseService";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

export default function Cases() {
  const workspace = useAppStore((state) => state.caseWorkspace);
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"ready" | "loading" | "empty" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { t } = useI18n();
  const [caseHistory, setCaseHistory] = useState<
    Array<{ id: string; name: string; status: string; updatedAt: string; domain: string; successfulRuns: number }>
  >([]);

  const loadCases = async (showSpinner = true) => {
    if (showSpinner) setMode("loading");
    else setRefreshing(true);
    setErrorMessage("");
    try {
      const rows = await caseService.listCases();
      const mapped = rows.map((r) => ({
        id: r.case_id,
        name: r.title,
        status: r.last_run_status || t("common.active"),
        updatedAt: new Date(r.updated_at).toLocaleString("en-IN"),
        domain: r.domain || "General",
        successfulRuns: Number(r.successful_run_count || 0),
      }));
      setCaseHistory(mapped);
      setMode(mapped.length ? "ready" : "empty");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("cases.failedDescription"));
      setMode("error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, []);

  const openCaseWorkspace = (caseId: string, title: string) => {
    setCaseWorkspace(caseId, title);
    setLocation(`/app/cases/${caseId}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {mode === "loading" ? <LoadingState title={t("cases.loading")} description={t("cases.loadingDescription")} /> : null}
      {mode === "error" ? <ErrorState title={t("cases.failed")} description={errorMessage || t("cases.failedDescription")} /> : null}
      {mode === "empty" ? (
        <EmptyState
          title={t("cases.emptyTitle")}
          description={t("cases.emptyDescription")}
          actionLabel={t("common.openQueryParsing")}
          onAction={() => setLocation("/app/agents/query")}
        />
      ) : null}

      {mode !== "ready" ? null : (
        <>
      <FadeIn>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold font-heading">{t("cases.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("cases.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadCases(false)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {t("cases.refresh")}
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="p-5 border-primary/20 bg-primary/5">
          <h2 className="font-semibold mb-2">{t("cases.currentWorkspace")}</h2>
          {workspace.caseId ? (
            <div className="text-sm text-muted-foreground">
              <p>{t("cases.usingCurrentCase", { caseId: workspace.caseId })} <span className="font-mono text-primary">{workspace.caseId}</span></p>
              <p>{t("cases.documentsAttached", { count: workspace.uploadedDocuments.length })}</p>
            </div>
          ) : (
            <EmptyState
              title={t("cases.noActiveWorkspace")}
              description={t("cases.noActiveWorkspaceDescription")}
            />
          )}
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
          <div className="space-y-3">
            {caseHistory.map((item) => (
            <ClickableCard
              key={item.id}
              ariaLabel={t("cases.openCase", { caseId: item.id })}
              className="p-4"
              onClick={() => openCaseWorkspace(item.id, item.name)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.domain}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{item.status}</p>
                  <p className="text-xs text-muted-foreground">{t("cases.successfulRuns", { count: item.successfulRuns })}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {item.updatedAt}
                  </p>
                </div>
              </div>
            </ClickableCard>
          ))}
        </div>
      </FadeIn>
        </>
      )}
    </div>
  );
}

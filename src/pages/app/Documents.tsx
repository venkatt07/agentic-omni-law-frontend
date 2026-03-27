import { Card } from "@/components/ui/card";
import { FadeIn } from "@/lib/magic-ui";
import { FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useState } from "react";
import BackButton from "@/components/app/BackButton";
import { useI18n } from "@/hooks/useI18n";

export default function Documents() {
  const [mode] = useState<"ready" | "loading" | "empty" | "error">("ready");
  const { t } = useI18n();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {mode === "loading" ? <LoadingState title={t("documents.loading")} description={t("documents.loadingDescription")} /> : null}
      {mode === "empty" ? <EmptyState title={t("documents.emptyTitle")} description={t("documents.emptyDescription")} /> : null}
      {mode === "error" ? <ErrorState title={t("documents.unavailable")} description={t("documents.unavailableDescription")} /> : null}

      {mode !== "ready" ? null : (
        <>
          <div className="flex items-center">
            <BackButton fallbackHref="/app/dashboard" />
          </div>

          <FadeIn>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-heading">{t("documents.title")}</h1>
                <p className="text-muted-foreground mt-1">{t("documents.subtitle")}</p>
              </div>
              <Link href="/app/documents/upload">
                <Button>{t("documents.upload")}</Button>
              </Link>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/app/documents/my">
              <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer h-full">
                <FolderOpen className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1">{t("documents.myTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("documents.myDescription")}</p>
              </Card>
            </Link>
            <Link href="/app/documents/upload">
              <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer h-full">
                <Upload className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1">{t("documents.uploadTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("documents.uploadDescription")}</p>
              </Card>
            </Link>
          </div>

          <EmptyState title={t("documents.readyTitle")} description={t("documents.readyDescription")} />
        </>
      )}
    </div>
  );
}

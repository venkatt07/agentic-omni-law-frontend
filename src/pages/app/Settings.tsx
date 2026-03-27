import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { LanguagePreferenceSelect } from "@/components/app/LanguagePreferenceSelect";
import { useI18n } from "@/hooks/useI18n";

export default function Settings() {
  const [mode] = useState<"ready" | "loading" | "empty" | "error">("ready");
  const theme = useAppStore((state) => state.theme);
  const largeText = useAppStore((state) => state.largeText);
  const setTheme = useAppStore((state) => state.setTheme);
  const setLargeText = useAppStore((state) => state.setLargeText);
  const { toast } = useToast();
  const { language, saving, updateLanguage } = useLanguagePreference();
  const { t } = useI18n();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {mode === "loading" ? <LoadingState title={t("settings.title")} description="Applying user preferences." /> : null}
      {mode === "empty" ? <EmptyState title={t("state.noSettingsAvailable")} description={t("state.settingsAfterLogin")} /> : null}
      {mode === "error" ? <ErrorState title={t("state.settingsUnavailable")} description={t("state.unableToLoadPreferences")} /> : null}
      {mode !== "ready" ? null : (
        <>
      <FadeIn>
        <div>
          <h1 className="text-3xl font-bold font-heading">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="p-6 space-y-5">
          <h2 className="text-lg font-semibold">{t("settings.languageSection")}</h2>
          <LanguagePreferenceSelect
            value={language}
            pending={saving}
            label={t("common.preferredLanguage")}
            helperText={t("settings.languageHelp")}
            onChange={async (nextLanguage) => {
              try {
                await updateLanguage(nextLanguage);
                toast({
                  title: t("common.languageUpdated"),
                  description: t("settings.languageSuccess", { language: nextLanguage }),
                });
              } catch (error) {
                toast({
                  title: t("common.languageUpdateFailed"),
                  description: error instanceof Error ? error.message : "Unable to save language preference.",
                  variant: "destructive",
                });
              }
            }}
          />
        </Card>
      </FadeIn>

      <FadeIn delay={0.16}>
        <Card className="p-6 space-y-5">
          <h2 className="text-lg font-semibold">{t("settings.appearance")}</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="theme-mode">{t("settings.darkMode")}</Label>
              <p className="text-sm text-muted-foreground">{t("settings.darkModeHelp")}</p>
            </div>
            <Switch
              id="theme-mode"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="large-text">{t("settings.largeText")}</Label>
              <p className="text-sm text-muted-foreground">{t("settings.largeTextHelp")}</p>
            </div>
            <Switch id="large-text" checked={largeText} onCheckedChange={setLargeText} />
          </div>
        </Card>
      </FadeIn>
        </>
      )}
    </div>
  );
}

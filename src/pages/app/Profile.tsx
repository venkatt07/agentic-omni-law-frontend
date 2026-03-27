import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { useLocation } from "wouter";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { LanguagePreferenceSelect } from "@/components/app/LanguagePreferenceSelect";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";

export default function Profile() {
  const [mode, setMode] = useState<"ready" | "loading" | "empty" | "error">("loading");
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const role = useAppStore((state) => state.selectedRole);
  const logout = useAppStore((state) => state.logout);
  const [, setLocation] = useLocation();
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const { language, saving, updateLanguage } = useLanguagePreference();
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    authService
      .me()
      .then(({ user: liveUser }) => {
        if (cancelled) return;
        setUser({
          id: liveUser.id,
          name: liveUser.name,
          email: liveUser.email,
          phone: liveUser.phone,
          gender: liveUser.gender ?? null,
          dateOfBirth: liveUser.dateOfBirth ?? null,
          role: liveUser.role,
          active_case_id: liveUser.active_case_id || null,
        });
        setMode(liveUser ? "ready" : "empty");
      })
      .catch((error) => {
        if (cancelled) return;
        if (!user) {
          setMode("error");
          setErrorMessage(error instanceof Error ? error.message : "Unable to load profile.");
          return;
        }
        setMode("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const handleLogout = () => {
    logout();
    setLocation("/auth/signin");
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {mode === "loading" ? <LoadingState title={t("state.loadingProfile")} description={t("state.fetchingAccountDetails")} /> : null}
      {mode === "empty" ? <EmptyState title={t("state.noProfileData")} description={t("state.signInToViewProfile")} /> : null}
      {mode === "error" ? <ErrorState title={t("state.profileUnavailable")} description={errorMessage || t("state.unableToLoadProfile")} /> : null}
      {mode !== "ready" ? null : (
        <>
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading">{t("profile.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("profile.subtitle")}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {user?.name?.slice(0, 2).toUpperCase() || "AO"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{user?.name || "Demo User"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email || "demo@agentic.omni"}</p>
              <p className="text-sm text-muted-foreground">{t("profile.role", { role: role || t("common.notAvailable") })}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.phoneLabel")}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{user?.phone || t("common.notAvailable")}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.genderLabel")}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{user?.gender || t("common.notAvailable")}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.dobLabel")}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{user?.dateOfBirth || t("common.notAvailable")}</div>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-border/60 bg-background/40 p-4 max-w-lg">
            <LanguagePreferenceSelect
              value={language}
              pending={saving}
              label={t("common.preferredLanguage")}
              helperText={t("profile.languageHelp")}
              onChange={async (nextLanguage) => {
                try {
                  await updateLanguage(nextLanguage);
                  toast({
                    title: t("common.languageUpdated"),
                    description: t("profile.languageSuccess", { language: nextLanguage }),
                  });
                } catch (error) {
                  toast({
                    title: t("common.languageUpdateFailed"),
                    description: error instanceof Error ? error.message : t("common.languageUpdateFailed"),
                    variant: "destructive",
                  });
                }
              }}
            />
          </div>
          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => setLocation("/app/settings")}>
              {t("profile.editPreferences")}
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              {t("nav.logout")}
            </Button>
          </div>
        </Card>
      </FadeIn>
        </>
      )}
    </div>
  );
}

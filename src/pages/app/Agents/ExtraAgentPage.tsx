import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { useRoute } from "wouter";
import { roleSpecificAgents } from "@/lib/agents";
import { useAppStore } from "@/store";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useState } from "react";
import RestrictedAccess from "@/components/app/RestrictedAccess";

export default function ExtraAgentPage() {
  const [match, params] = useRoute("/app/agents/extras/:slug");
  const role = useAppStore((state) => state.selectedRole);
  const extra = roleSpecificAgents(role).find((item) => item.href.endsWith(params?.slug || ""));
  const [mode] = useState<"ready" | "loading" | "empty" | "error">("ready");

  if (match && !extra) {
    return (
      <RestrictedAccess description="This role-specific tool is not available for your active role." />
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {mode === "loading" ? <LoadingState title="Loading role module" description="Preparing role-specific module." /> : null}
      {mode === "empty" ? <EmptyState title="No role module" description="Select role and retry." /> : null}
      {mode === "error" ? <ErrorState title="Role module unavailable" description="Could not initialize module." /> : null}

      {mode !== "ready" ? null : (
        <>
          <FadeIn>
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-heading">{extra?.title || "Role Agent Module"}</h1>
              <p className="text-muted-foreground mt-1">
                {extra?.description || "Role-specific module scaffold."}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="p-10 text-center border-dashed bg-muted/20">
              <h2 className="font-semibold text-lg mb-2">
                {match && extra ? "Coming Soon" : "Agent Not Available"}
              </h2>
              <p className="text-sm text-muted-foreground">
                This role-specific feature exists and route is active in the frontend scaffold.
              </p>
            </Card>
          </FadeIn>
        </>
      )}
    </div>
  );
}

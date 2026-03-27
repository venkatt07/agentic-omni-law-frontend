import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { commonAgents, outputItems, roleSpecificAgents } from "@/lib/agents";
import { useAppStore } from "@/store";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useState } from "react";

export default function AgentsHub() {
  const role = useAppStore((state) => state.selectedRole);
  const extras = roleSpecificAgents(role);
  const [mode] = useState<"ready" | "loading" | "empty" | "error">("ready");

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {mode === "loading" ? <LoadingState title="Loading agents" description="Preparing available modules." /> : null}
      {mode === "empty" ? <EmptyState title="No agents configured" description="Select role and retry." /> : null}
      {mode === "error" ? <ErrorState title="Agents unavailable" description="Could not load agent configuration." /> : null}

      {mode !== "ready" ? null : (
        <>
          <FadeIn>
            <div>
              <h1 className="text-3xl font-bold font-heading">AI Agents</h1>
              <p className="text-muted-foreground mt-1">
                Common agents are always available. Role-specific tools update instantly based on active role.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <section>
              <h2 className="text-xl font-semibold mb-4">Common Modules (All Roles)</h2>
              <p className="text-sm text-muted-foreground mb-4">6 modules match the PDF workflow. Help & Support (Chatbot) is available separately.</p>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {commonAgents.map((agent) => (
                  <Link key={agent.id} href={agent.href}>
                    <Card className="p-5 h-full hover:border-primary/60 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 bg-primary/10 text-primary rounded-md flex items-center justify-center">
                          <agent.icon className="h-4 w-4" />
                        </div>
                        <p className="font-semibold">{agent.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={0.2}>
            <section>
              <h2 className="text-xl font-semibold mb-4">Outputs</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {outputItems.map((item) => (
                  <Link key={item.id} href={item.href}>
                    <Card className="p-5 h-full hover:border-primary/60 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 bg-primary/10 text-primary rounded-md flex items-center justify-center">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <p className="font-semibold">{item.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </FadeIn>

          <FadeIn delay={0.3}>
            <section>
              <h2 className="text-xl font-semibold mb-4">Role-specific Tools ({role || "No role selected"})</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {extras.map((agent) => (
                  <Link key={agent.id} href={agent.href}>
                    <Card className="p-5 h-full hover:border-primary/60 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-9 w-9 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center">
                          <agent.icon className="h-4 w-4" />
                        </div>
                        {agent.comingSoon ? <Badge variant="secondary">Coming Soon</Badge> : null}
                      </div>
                      <p className="font-semibold mb-2">{agent.title}</p>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </FadeIn>
        </>
      )}
    </div>
  );
}

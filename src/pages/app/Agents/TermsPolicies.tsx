import { FadeIn } from "@/lib/magic-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useState } from "react";
import CaseContextBanner from "@/components/app/CaseContextBanner";
import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function TermsPolicies() {
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const output = useAppStore((state) => (activeCaseId ? state.casesById[activeCaseId]?.outputs.terms_and_policies : undefined));
  const [, setLocation] = useLocation();
  const [mode] = useState<"ready" | "loading" | "error">("ready");
  const groupedCitations = (output?.citations || []).reduce<Record<string, NonNullable<typeof output>["citations"]>>((acc, c) => {
    const key = c.source_type || "user_doc";
    (acc[key] ||= []).push(c as any);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {mode === "loading" ? <LoadingState title="Loading terms & policies" description="Reading sources and generating grounded terms." /> : null}
      {mode === "error" ? <ErrorState title="Terms & Policies failed" description="Please rerun the pipeline." /> : null}
      {mode !== "ready" ? null : (
        <>
          <FadeIn>
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-heading">Terms & Policies</h1>
              <p className="text-muted-foreground mt-1">Source-grounded terms, policy applicability, and risk flags.</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}><CaseContextBanner /></FadeIn>

          {output ? (
            <FadeIn delay={0.2}>
              <div className="space-y-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="font-semibold">Summary</h2>
                    {typeof output.confidence === "number" ? <Badge variant="outline">Confidence: {Math.round(output.confidence * 100)}%</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{output.summary}</p>
                </Card>
                <Card className="p-5">
                  <h2 className="font-semibold mb-2">Applicable Policies</h2>
                  <div className="space-y-2">
                    {(output.applicable_policies || []).map((item: { name: string; rationale: string }) => (
                      <div key={item.name} className="text-sm">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted-foreground">{item.rationale}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <h2 className="font-semibold mb-2">Recommended Terms</h2>
                  <div className="space-y-3">
                    {(output.recommended_terms || []).map((term: { title: string; clause_text: string }) => (
                      <div key={term.title} className="text-sm">
                        <p className="font-medium">{term.title}</p>
                        <p className="text-muted-foreground">{term.clause_text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <h2 className="font-semibold mb-2">Risk Flags</h2>
                  <div className="space-y-2">
                    {(output.risk_flags || []).map((flag: { title: string; description: string }) => (
                      <div key={flag.title} className="text-sm">
                        <p className="font-medium">{flag.title}</p>
                        <p className="text-muted-foreground">{flag.description}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <h2 className="font-semibold mb-2">Citations</h2>
                  <div className="space-y-3 text-sm">
                    {(output.citations || []).length ? (
                      Object.entries(groupedCitations).map(([sourceType, items]) => (
                        <div key={sourceType} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{sourceType}</Badge>
                            <span className="text-xs text-muted-foreground">{(items || []).length} citation(s)</span>
                          </div>
                          {(items || []).map((c: any) => (
                            <div key={`${c.doc_id}:${c.chunk_id}`} className="border rounded-md p-2">
                              <div className="flex flex-wrap gap-2 mb-1">
                                {c.source_label ? <Badge variant="outline">{c.source_label}</Badge> : null}
                                <span className="text-xs text-muted-foreground">{c.doc_id} / {c.chunk_id}</span>
                              </div>
                              <p className="text-muted-foreground">{c.snippet}</p>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No citations available yet.</p>
                    )}
                  </div>
                </Card>
              </div>
            </FadeIn>
          ) : (
            <FadeIn delay={0.2}>
              <EmptyState title="Not run yet" description="Run the pipeline to populate Terms & Policies." actionLabel="Go to Query Parsing" onAction={() => setLocation("/app/agents/query")} />
            </FadeIn>
          )}
        </>
      )}
    </div>
  );
}

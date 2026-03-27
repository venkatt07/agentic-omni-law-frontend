import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import ClickableCard from "@/components/app/ClickableCard";
import { caseService, type SearchResultItem } from "@/services/caseService";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  const [mode, setMode] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const query = useMemo(() => {
    const url = new URL(`http://localhost${location}`);
    return url.searchParams.get("q")?.trim() || "";
  }, [location]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!query) {
        setResults([]);
        setMode("empty");
        return;
      }
      setMode("loading");
      setErrorMessage("");
      try {
        const items = await caseService.searchWorkspace(query);
        if (cancelled) return;
        setResults(items);
        setMode(items.length ? "ready" : "empty");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Search failed.");
        setMode("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-4">
      <Card className="p-5">
        <h1 className="text-2xl font-bold font-heading">Search Results</h1>
        <p className="text-muted-foreground text-sm mt-1">Query: "{query || "empty"}"</p>
      </Card>

      {mode === "loading" ? <LoadingState title="Searching workspace" description="Looking across cases, documents, and agent routes." /> : null}
      {mode === "error" ? <ErrorState title="Search failed" description={errorMessage || "Unable to load search results."} /> : null}
      {mode === "empty" ? (
        <EmptyState
          title={query ? "No matches found" : "Enter a search query"}
          description={query ? "Try a case title, case ID, document name, or agent name." : "Use the search box to look across your workspace."}
        />
      ) : null}

      {mode === "ready" ? (
        <div className="space-y-3">
          {results.map((item) => (
            <ClickableCard
              key={`${item.type}:${item.id}`}
              ariaLabel={`Open ${item.title}`}
              onClick={() => setLocation(item.href)}
              className="p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                  {item.subtitle ? <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p> : null}
                </div>
                <Badge variant="outline">{item.type}</Badge>
              </div>
            </ClickableCard>
          ))}
        </div>
      ) : null}

      <Link href="/app/dashboard">
        <span className="text-sm text-primary cursor-pointer hover:underline">Back to Dashboard</span>
      </Link>
    </div>
  );
}

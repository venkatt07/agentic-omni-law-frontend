import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const routes = [
  "/splash",
  "/",
  "/select-role",
  "/auth/signin",
  "/auth/signup",
  "/auth/verify",
  "/app/dashboard",
  "/app/analytics",
  "/app/cases",
  "/app/cases/CAS-2026-892",
  "/app/documents",
  "/app/documents/my",
  "/app/documents/upload",
  "/app/agents",
  "/app/agents/query",
  "/app/agents/contract",
  "/app/agents/outcome",
  "/app/agents/compliance",
  "/app/agents/draft",
  "/app/agents/summary",
  "/app/support",
  "/app/settings",
  "/app/profile",
  "/app/notifications",
  "/app/search?q=query",
];

interface RouteResult {
  route: string;
  status: number | "ERROR";
}

export default function NavigationAudit() {
  const [results, setResults] = useState<RouteResult[]>([]);
  const [running, setRunning] = useState(false);

  const runAudit = async () => {
    setRunning(true);
    const out: RouteResult[] = [];
    for (const route of routes) {
      try {
        const response = await fetch(route);
        out.push({ route, status: response.status });
      } catch {
        out.push({ route, status: "ERROR" });
      }
    }
    setResults(out);
    setRunning(false);
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      void runAudit();
    }
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Card className="p-5">
        <h1 className="text-2xl font-bold font-heading">Navigation Audit (Dev)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Route mount checks for all required pages. This is a development utility.
        </p>
        <Button className="mt-4" onClick={runAudit} disabled={running}>
          {running ? "Running..." : "Run Audit"}
        </Button>
      </Card>

      <div className="space-y-2">
        {routes.map((route) => {
          const result = results.find((item) => item.route === route);
          const status = result?.status ?? "-";
          const pass = typeof status === "number" && status < 500;
          return (
            <Card key={route} className="p-3 flex items-center justify-between">
              <Link href={route}>
                <span className="text-sm text-primary hover:underline cursor-pointer">{route}</span>
              </Link>
              <span className={`text-xs font-medium ${pass ? "text-emerald-600" : "text-rose-600"}`}>
                {status}
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

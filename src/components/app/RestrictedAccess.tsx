import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface RestrictedAccessProps {
  title?: string;
  description?: string;
}

export default function RestrictedAccess({
  title = "Access restricted for your role",
  description = "This module is not available for your active role. Switch role in settings to continue.",
}: RestrictedAccessProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <Card className="p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold font-heading">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => setLocation("/app/dashboard")}>Back to Dashboard</Button>
          <Button variant="outline" onClick={() => setLocation("/app/settings")}>
            Switch Role
          </Button>
        </div>
      </Card>
    </div>
  );
}

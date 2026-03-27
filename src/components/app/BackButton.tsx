import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
  disableHistory?: boolean;
}

export default function BackButton({
  fallbackHref = "/",
  label = "Back",
  className,
  disableHistory = false,
}: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (disableHistory) {
      setLocation(fallbackHref);
      return;
    }

    if (typeof window !== "undefined") {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const sameOriginReferrer = document.referrer
        ? (() => {
            try {
              const referrerUrl = new URL(document.referrer);
              return referrerUrl.origin === window.location.origin
                ? `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`
                : "";
            } catch {
              return "";
            }
          })()
        : "";

      if (sameOriginReferrer && sameOriginReferrer !== currentPath) {
        window.history.back();
        return;
      }

      if (window.history.length > 1) {
        window.history.back();
        window.setTimeout(() => {
          const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          if (nextPath === currentPath) setLocation(fallbackHref);
        }, 120);
        return;
      }
    }
    setLocation(fallbackHref);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleBack}
      className={cn("gap-2", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}

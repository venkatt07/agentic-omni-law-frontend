import BackButton from "@/components/app/BackButton";

type AgentReportBackButtonProps = {
  fallbackHref: string;
  fallbackLabel?: string;
  className?: string;
};

export default function AgentReportBackButton({
  fallbackHref,
  fallbackLabel = "Back",
  className,
}: AgentReportBackButtonProps) {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const returnTo = params.get("returnTo") || "";
  const shouldPreferFallback =
    Boolean(returnTo) ||
    /query parsing/i.test(fallbackLabel) ||
    fallbackHref.startsWith("/app/agents/query") ||
    /\/app\/cases\/[^/]+\/agents\/query-parsing(?:\/|$)/.test(fallbackHref);

  return (
    <BackButton
      fallbackHref={returnTo || fallbackHref}
      label={returnTo ? "Back to Automated Report" : fallbackLabel}
      disableHistory={shouldPreferFallback}
      className={className}
    />
  );
}

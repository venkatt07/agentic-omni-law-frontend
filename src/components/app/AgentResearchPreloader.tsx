import AgentProcessingScreen, { type AgentProcessingStep } from "@/components/app/AgentProcessingScreen";

type StepState = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface AgentPreloaderStep {
  key: string;
  label: string;
  state: StepState;
}

interface AgentResearchPreloaderProps {
  title?: string;
  subtitle?: string;
  steps: AgentPreloaderStep[];
  domainLabel?: string;
  jurisdictionLabel?: string;
  scopeLabel?: string;
}

export default function AgentResearchPreloader({
  title = "AI is researching your query...",
  subtitle = "This may take a few seconds",
  steps,
  domainLabel,
  jurisdictionLabel,
  scopeLabel,
}: AgentResearchPreloaderProps) {
  const completed = steps.filter((step) => step.state === "SUCCEEDED").length;
  const progressPct = steps.length ? Math.round((completed / steps.length) * 100) : 0;

  return (
    <AgentProcessingScreen
      eyebrow="Agent Research"
      title={title}
      subtitle={subtitle}
      statusLabel={domainLabel || "Legal research"}
      statusDetail="Retrieval and synthesis are running against the active legal workspace."
      progressPct={progressPct}
      steps={steps as AgentProcessingStep[]}
      metrics={[
        { label: "Steps", value: `${completed}/${steps.length}`, hint: "completed" },
        { label: "Jurisdiction", value: jurisdictionLabel || "All India", hint: "active scope" },
      ]}
      metaItems={[
        ...(domainLabel ? [{ label: "Detected domain", value: domainLabel }] : []),
        { label: "Search scope", value: scopeLabel || "Case workspace" },
      ]}
    />
  );
}

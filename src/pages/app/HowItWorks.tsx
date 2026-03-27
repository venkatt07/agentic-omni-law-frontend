import ThemeBackdrop from "@/components/app/ThemeBackdrop";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/lib/magic-ui";

const steps = [
  {
    title: "1. Upload Once",
    description: "Upload documents to a shared case workspace. Files are reused across Query Parsing and all agents.",
  },
  {
    title: "2. Query Parsing",
    description: "Describe the legal issue. Query Parsing extracts domain, risks, and structured context for downstream agents.",
  },
  {
    title: "3. Run Agents",
    description: "Use Run All to orchestrate common and role-specific agents on the same case context and uploaded files.",
  },
  {
    title: "4. Final Summary",
    description: "Review consolidated outputs in the Final Summary module with key findings across all legal modules.",
  },
];

export default function HowItWorks() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <FadeIn>
        <ThemeBackdrop contentClassName="mx-auto">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.25)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <h1 className="text-3xl md:text-4xl font-bold font-heading">How It Works</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              A streamlined legal workflow: upload case files once, parse the issue, run agents automatically, and review a consolidated final summary.
            </p>
          </div>
        </ThemeBackdrop>
      </FadeIn>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <FadeIn key={step.title} delay={0.06 * (index + 1)}>
            <Card className="p-5 h-full">
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-6">{step.description}</p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}


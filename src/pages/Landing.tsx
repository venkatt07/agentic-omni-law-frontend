import Navbar from "@/components/layout/Navbar";
import { FadeIn } from "@/lib/magic-ui";
import { ArrowRight, FileSearch, Orbit, Scale, Shield, Sparkles, Workflow, MousePointer2, Layers3, ScanSearch } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { analyticsService, type AnalyticsOverview } from "@/services/analyticsService";

const modules = [
  {
    title: "Query Parsing",
    desc: "Turn unstructured case facts into jurisdiction, legal grounds, acts, and retrieval strategy.",
    icon: FileSearch,
  },
  {
    title: "Contract Risk",
    desc: "Review agreements for risk, negotiation pressure points, and missing protection clauses.",
    icon: Shield,
  },
  {
    title: "Outcome Projection",
    desc: "Estimate risk posture, likely timelines, and matter direction from retrieved legal context.",
    icon: Scale,
  },
  {
    title: "Workflow Orchestration",
    desc: "Carry evidence, reports, and legal context across agents without resetting the workspace.",
    icon: Workflow,
  },
];

const agentWalkthrough = [
  {
    title: "Query Parsing",
    eyebrow: "Step 01",
    when: "Start here when the user has pasted facts, uploaded evidence, or wants the system to understand the dispute first.",
    output: "Detects domain, jurisdiction, grounding strategy, legal issues, and prepares the workspace for downstream agents.",
  },
  {
    title: "Contract Risk",
    eyebrow: "Step 02",
    when: "Use when the case involves agreements, clauses, payment obligations, termination issues, or negotiation pressure points.",
    output: "Surfaces clause risk, missing protections, liability hotspots, and practical review guidance for the contract.",
  },
  {
    title: "Outcome Prediction",
    eyebrow: "Step 03",
    when: "Use after facts are structured and the case has enough context for precedent comparison and probability modeling.",
    output: "Frames likely outcomes, risk distribution, timing expectations, and strategic pressure scenarios.",
  },
  {
    title: "Policy & Compliance",
    eyebrow: "Step 04",
    when: "Use for regulatory review, policy checks, internal governance gaps, and compliance posture assessment.",
    output: "Maps the case or document against policy obligations, regulatory concerns, and operational compliance gaps.",
  },
  {
    title: "Legal Drafts",
    eyebrow: "Step 05",
    when: "Use once the matter is grounded and the user is ready to generate notices, drafts, or document-ready legal output.",
    output: "Generates actionable draft surfaces tied to the same case context instead of detached one-off text generation.",
  },
];

const stackCards = [
  {
    eyebrow: "Shared workspace",
    title: "One legal workspace for every agent",
    body:
      "Upload once, persist context, and keep every module attached to the same matter instead of copying data across tools.",
  },
  {
    eyebrow: "Retrieval grounded",
    title: "Acts, case law, and docs in the loop",
    body:
      "RAG-backed flows are surfaced directly in the UI so users can see that outputs are tied to retrieved material, not generic text generation.",
  },
  {
    eyebrow: "Decision ready",
    title: "Outputs shaped for action",
    body:
      "Reports, summaries, compliance findings, and draft generation are designed as operational surfaces for legal teams and role-based users.",
  },
];

const storyPanels = [
  {
    title: "Command",
    body: "Users start from a legal command surface that already understands workspace context, uploaded evidence, and role intent.",
  },
  {
    title: "Ground",
    body: "Retrieval, citations, and acts are surfaced before the generated result so the workflow stays grounded and defensible.",
  },
  {
    title: "Operate",
    body: "Outputs feed directly into reports, drafts, risk checks, and role-specific agents without resetting the case context.",
  },
];

const operatingPanels = [
  {
    title: "Mouse-reactive workspace canvas",
    body: "Ambient fields, scroll choreography, and motion depth make the interface feel alive without turning it into a marketing gimmick.",
    icon: MousePointer2,
  },
  {
    title: "Persistent multi-agent layer",
    body: "Cases, documents, retrieval state, and downstream outputs stay attached to one legal workspace instead of breaking across pages.",
    icon: Layers3,
  },
  {
    title: "RAG-forward legal operation",
    body: "The product surfaces legal grounding before synthesis so users can see that acts, case law, and documents are carrying the result.",
    icon: ScanSearch,
  },
];

export default function Landing() {
  const reduceMotion = useReducedMotion();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    analyticsService
      .getOverview()
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
      })
      .catch(() => {
        if (cancelled) return;
        setOverview(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const heroMetrics = useMemo(() => {
    const totals = overview?.totals;
    const topPages = overview?.top_pages || [];
    return {
      activeVisitors: totals?.active_visitors_24h || 0,
      successfulRuns: totals?.successful_runs_30d || 0,
      activeCases: totals?.active_cases || 0,
      mobileUsers: totals?.mobile_visitors_30d || 0,
      iphoneUsers: totals?.iphone_visitors_30d || 0,
      topPages,
    };
  }, [overview]);

  const summaryStats = useMemo(
    () => [
      { label: "Active now", value: heroMetrics.activeVisitors.toLocaleString("en-IN") },
      { label: "Active cases", value: heroMetrics.activeCases.toLocaleString("en-IN") },
      { label: "Mobile users", value: heroMetrics.mobileUsers.toLocaleString("en-IN") },
      { label: "iPhone users", value: heroMetrics.iphoneUsers.toLocaleString("en-IN") },
      { label: "Runs in 30d", value: heroMetrics.successfulRuns.toLocaleString("en-IN") },
    ],
    [heroMetrics],
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#0b1120] dark:text-white">
      <Navbar />

      <main className="relative overflow-hidden">
        <section
          id="home"
          className="relative overflow-hidden px-4 pb-24 pt-24 text-white md:px-6 md:pb-28 md:pt-28 xl:px-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#08173f_0%,#0d2f88_42%,#0b6ad5_100%)] dark:bg-[linear-gradient(135deg,#07122f_0%,#0b1b53_44%,#0b4fb0_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(44%_38%_at_100%_0%,rgba(255,255,255,0.18),transparent_52%),radial-gradient(36%_32%_at_0%_100%,rgba(56,189,248,0.18),transparent_48%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:52px_52px] opacity-25" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_36%_at_50%_0%,rgba(255,255,255,0.12),transparent_58%)]" />

          <div className="relative mx-auto max-w-[92rem]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,36rem)] lg:items-center">
              <div className="max-w-[46rem]">
                <FadeIn>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/88">
                    <Sparkles className="h-3.5 w-3.5" />
                    Agentic Omni for legal operations
                  </div>
                </FadeIn>

                <FadeIn delay={0.06}>
                  <h1 className="max-w-[10.5ch] text-[3.25rem] font-semibold font-heading leading-[0.9] tracking-[-0.065em] md:text-[4.8rem] xl:text-[6rem]">
                    A legal workspace built for real execution.
                  </h1>
                </FadeIn>

                <FadeIn delay={0.12}>
                  <p className="mt-6 max-w-[39rem] text-[1.02rem] leading-8 text-white/76 md:text-[1.14rem]">
                    Agentic Omni Law combines persistent case workspace, retrieval-backed reasoning, and role-specific agents in one operating system for legal execution.
                  </p>
                </FadeIn>

                <FadeIn delay={0.18}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/select-role">
                      <Button className="h-11 rounded-full bg-white px-5 text-sm font-medium text-[#0d47c4] shadow-[0_22px_42px_-24px_rgba(255,255,255,0.45)] hover:bg-white/92">
                        Open Workspace
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/auth/signin">
                      <Button
                        variant="outline"
                        className="h-11 rounded-full border-white/22 bg-white/8 px-5 text-sm text-white hover:bg-white/12"
                      >
                        Sign In
                      </Button>
                    </Link>
                  </div>
                </FadeIn>

                <FadeIn delay={0.24}>
                  <div className="mt-10 grid max-w-[42rem] grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { value: "Persistent", label: "Case context" },
                      { value: "RAG + LLM", label: "Reasoning layer" },
                      { value: "Multi-agent", label: "Workflow engine" },
                      { value: "Report-ready", label: "Decision output" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[1rem] border border-white/12 bg-white/[0.08] px-3 py-3 backdrop-blur-sm"
                      >
                        <div className="text-sm font-semibold text-white">{item.value}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/60">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </FadeIn>
              </div>

              <FadeIn delay={0.08}>
                <motion.div
                  initial={reduceMotion ? false : { y: 18, opacity: 0 }}
                  animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative"
                >
                  <div className="pointer-events-none absolute inset-[-8%] rounded-[2rem] bg-[radial-gradient(62%_58%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)] blur-2xl" />
                  <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,26,78,0.84),rgba(7,18,52,0.92))] p-4 shadow-[0_34px_80px_-40px_rgba(2,6,23,0.68)] backdrop-blur-xl md:p-5">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:36px_36px] opacity-35" />
                    <div className="relative rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">Live case telemetry</div>
                          <div className="mt-1 text-lg font-semibold text-white">Real case activity flowing into analytics</div>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-200">
                          <Orbit className="h-3.5 w-3.5" />
                          Live now
                        </div>
                      </div>

                      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/30 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/45">Realtime case snapshot</div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-[15px] leading-7 text-white/88">
                          {heroMetrics.activeVisitors.toLocaleString("en-IN")} users are active now, {heroMetrics.mobileUsers.toLocaleString("en-IN")} are coming from mobile, and {heroMetrics.successfulRuns.toLocaleString("en-IN")} automated runs were completed in the last 30 days.
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1 text-[11px] font-medium text-sky-100">
                            <FileSearch className="h-3.5 w-3.5" />
                            Live case signals
                          </div>
                          <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#0d47c4]">Realtime</div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">System state</div>
                          <div className="space-y-2">
                            {[
                              ["Active now", heroMetrics.activeVisitors.toLocaleString("en-IN")],
                              ["Active cases", heroMetrics.activeCases.toLocaleString("en-IN")],
                              ["iPhone users", heroMetrics.iphoneUsers.toLocaleString("en-IN")],
                              ["Runs in 30d", heroMetrics.successfulRuns.toLocaleString("en-IN")],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-sm">
                                <span className="text-white/60">{label}</span>
                                <span className="font-medium text-white">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Case activity</div>
                          <div className="space-y-2">
                            {[
                              `${heroMetrics.activeCases.toLocaleString("en-IN")} active matters in workspace`,
                              `${heroMetrics.successfulRuns.toLocaleString("en-IN")} automated runs completed in 30 days`,
                              `${heroMetrics.activeVisitors.toLocaleString("en-IN")} users currently active across the product`,
                            ].map((item) => (
                              <div key={item} className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-white/78">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </FadeIn>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-14 bg-background [clip-path:polygon(0_100%,100%_0,100%_100%)]" />
        </section>

        <section className="relative px-4 pb-10 pt-8 md:px-6 md:pb-14 xl:px-8">
          <div className="mx-auto max-w-[92rem] border-y border-slate-200/80 py-5 dark:border-white/10">
            <div className="grid gap-5 md:grid-cols-5 md:gap-8">
            {summaryStats.map((item) => (
              <div
                key={item.label}
                className="min-w-0"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-[1.6rem] font-semibold tracking-[-0.04em] text-[#0d47c4] dark:text-sky-300">{item.value}</div>
              </div>
            ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-4 py-14 md:px-6 md:py-18 xl:px-8">
          <div className="mx-auto max-w-[92rem]">
            <FadeIn>
              <div className="mb-10 max-w-[44rem]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#0d47c4] dark:text-sky-300">Product stack</div>
                <h2 className="mt-3 text-[2.2rem] font-semibold font-heading tracking-[-0.05em] md:text-[3rem]">
                  Built like a serious web product, not a collection of AI demos.
                </h2>
                <p className="mt-3 text-[1rem] leading-8 text-muted-foreground">
                  The system is structured as modules with clear responsibilities, shared state, and one persistent workspace surface.
                </p>
              </div>
            </FadeIn>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {modules.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                  className="group rounded-[1.3rem] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] transition-transform duration-300 hover:-translate-y-1 dark:border-white/8 dark:bg-white/[0.04]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-[#eef4ff] text-[#0d47c4] dark:bg-sky-400/10 dark:text-sky-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 md:px-6 xl:px-8">
          <div className="mx-auto grid max-w-[92rem] gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#0d47c4] dark:text-sky-300">Agent walkthrough</div>
              <h2 className="mt-3 text-[2.15rem] font-semibold font-heading tracking-[-0.05em] md:text-[3.05rem]">
                A guided explanation of how users move through the product.
              </h2>
              <p className="mt-4 max-w-[34rem] text-[1rem] leading-8 text-muted-foreground">
                Each agent has a clear role in the workflow. The landing experience should make that explicit so users understand what to do first, what comes next, and why each output exists.
              </p>
            </div>

            <div className="space-y-4">
              {agentWalkthrough.map((agent, index) => (
                <motion.div
                  key={agent.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.18 }}
                  transition={{ duration: 0.42, delay: index * 0.05, ease: "easeOut" }}
                  className="app-premium-card rounded-[1.7rem] p-6 md:p-7"
                >
                  <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)] md:items-start">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#0d47c4] dark:text-sky-300">{agent.eyebrow}</div>
                      <h3 className="mt-2 text-[1.6rem] font-semibold font-heading tracking-[-0.035em]">{agent.title}</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-white/40 bg-white/34 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">When to use</div>
                        <p className="mt-3 text-sm leading-8 text-muted-foreground">{agent.when}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/40 bg-white/34 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">What it produces</div>
                        <p className="mt-3 text-sm leading-8 text-muted-foreground">{agent.output}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="px-4 py-16 md:px-6 xl:px-8">
          <div className="mx-auto grid max-w-[92rem] gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#0d47c4] dark:text-sky-300">Scroll story</div>
              <h2 className="mt-3 text-[2.1rem] font-semibold font-heading tracking-[-0.05em] md:text-[3rem]">
                A product narrative, not a flat website.
              </h2>
              <p className="mt-4 max-w-[36rem] text-[1rem] leading-8 text-muted-foreground">
                The platform should feel like an operating layer for legal work. The interface moves from intake to grounded reasoning to downstream execution with one visual system.
              </p>
            </div>

            <div className="space-y-5">
              {storyPanels.map((panel, index) => (
                <motion.div
                  key={panel.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 26 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
                  className="app-page-section overflow-hidden"
                >
                  <div className="relative z-10 grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Phase 0{index + 1}</div>
                      <h3 className="mt-2 text-[1.8rem] font-semibold font-heading tracking-[-0.04em]">{panel.title}</h3>
                    </div>
                  <div className="rounded-[1.3rem] border border-white/45 bg-white/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/8 dark:bg-white/[0.03] dark:shadow-none">
                      <p className="text-sm leading-8 text-muted-foreground">{panel.body}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 md:px-6 xl:px-8">
          <div className="mx-auto max-w-[92rem]">
            <div className="mb-8 max-w-[42rem]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#0d47c4] dark:text-sky-300">Product behavior</div>
              <h2 className="mt-3 text-[2.1rem] font-semibold font-heading tracking-[-0.05em] md:text-[3rem]">
                Designed like an operating canvas, not a template.
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {operatingPanels.map((panel, index) => (
                <motion.div
                  key={panel.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
                  className="app-premium-card rounded-[1.5rem] p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(13,71,196,0.12),rgba(34,211,238,0.12))] text-[#0d47c4] dark:text-sky-300">
                    <panel.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-[1.25rem] font-semibold font-heading tracking-[-0.03em]">{panel.title}</h3>
                  <p className="mt-3 text-sm leading-8 text-muted-foreground">{panel.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f0f5ff] px-4 py-16 dark:bg-[#0d162d] md:px-6 xl:px-8">
          <div className="mx-auto grid max-w-[92rem] gap-5 lg:grid-cols-3">
            {stackCards.map((item, index) => (
              <motion.div
                key={item.title}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
                className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.1)] dark:border-white/8 dark:bg-[#10192f]"
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#0d47c4] dark:text-sky-300">{item.eyebrow}</div>
                <h3 className="mt-3 text-[1.55rem] font-semibold font-heading tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-3 text-sm leading-8 text-muted-foreground">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="contact" className="px-4 py-16 md:px-6 xl:px-8">
          <div className="mx-auto max-w-[92rem]">
            <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#08204f_0%,#0d47c4_58%,#2b84ff_100%)] px-6 py-9 text-white shadow-[0_30px_80px_-42px_rgba(2,6,23,0.82)] md:px-8 md:py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(52%_62%_at_0%_0%,rgba(255,255,255,0.18),transparent_42%),radial-gradient(48%_58%_at_100%_0%,rgba(34,211,238,0.18),transparent_34%)]" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[42rem]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/62">Enter the workspace</div>
                  <h2 className="mt-2 text-[2rem] font-semibold font-heading tracking-[-0.04em] md:text-[2.8rem]">
                    Bring legal teams onto one AI-native operating layer.
                  </h2>
                  <p className="mt-3 text-sm leading-8 text-white/74 md:text-base">
                    Open a role-based workspace, keep context persistent, and move across grounded agent workflows with one product system.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/select-role">
                    <Button className="h-11 rounded-full bg-white px-5 text-sm text-[#0d47c4] hover:bg-white/92">
                      Select Role
                    </Button>
                  </Link>
                  <Link href="/auth/signin">
                    <Button variant="outline" className="h-11 rounded-full border-white/24 bg-white/8 px-5 text-sm text-white hover:bg-white/12">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

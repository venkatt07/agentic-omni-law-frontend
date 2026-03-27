import type { AgentProcessingStep } from "@/components/app/AgentProcessingScreen";

interface CanonicalStep {
  key: string;
  label: string;
}

interface AnalyzingProgressOptions {
  stepIndex?: number | null;
  overallPct?: number | null;
}

function normalizeStepToken(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findCanonicalIndex(canonicalSteps: CanonicalStep[], value: unknown) {
  const target = normalizeStepToken(value);
  if (!target) return -1;
  return canonicalSteps.findIndex((step) => {
    const key = normalizeStepToken(step.key);
    const label = normalizeStepToken(step.label);
    return (
      target === key ||
      target === label ||
      target.includes(key) ||
      key.includes(target) ||
      target.includes(label) ||
      label.includes(target)
    );
  });
}

export function buildAnalyzingStepRows(
  canonicalSteps: CanonicalStep[],
  currentStep: unknown,
  backendSteps: any[],
  options: AnalyzingProgressOptions = {},
): AgentProcessingStep[] {
  const currentIndex = Math.max(0, findCanonicalIndex(canonicalSteps, currentStep));
  const matchedBackend = new Map<number, any>();
  let runningIndex = -1;
  let completedIndex = -1;
  const stepIndex =
    typeof options.stepIndex === "number" && Number.isFinite(options.stepIndex)
      ? Math.max(0, Math.min(canonicalSteps.length - 1, Number(options.stepIndex)))
      : -1;
  const overallPct =
    typeof options.overallPct === "number" && Number.isFinite(options.overallPct)
      ? Math.max(0, Math.min(100, Number(options.overallPct)))
      : null;
  const perStepPct = canonicalSteps.length > 0 ? 100 / canonicalSteps.length : 100;
  const inferredIndexFromPct =
    overallPct != null
      ? Math.max(0, Math.min(canonicalSteps.length - 1, Math.floor(Math.max(0, overallPct - 0.001) / perStepPct)))
      : -1;
  const inferredDoneFromPct =
    overallPct != null
      ? Math.max(-1, Math.min(canonicalSteps.length - 1, Math.floor(overallPct / perStepPct) - 1))
      : -1;

  for (const backendStep of backendSteps) {
    const idx = findCanonicalIndex(canonicalSteps, backendStep?.name || backendStep?.key || backendStep?.label);
    if (idx < 0) continue;
    matchedBackend.set(idx, backendStep);
    const state = String(backendStep?.state || "").toUpperCase();
      if (state === "RUNNING") runningIndex = idx;
      if (state === "SUCCEEDED") completedIndex = Math.max(completedIndex, idx);
  }

  const activeIndex =
    runningIndex >= 0
      ? runningIndex
      : stepIndex >= 0
        ? stepIndex
        : inferredIndexFromPct >= 0
          ? inferredIndexFromPct
          : currentIndex;
  const doneThroughIndex = Math.max(completedIndex, stepIndex >= 0 ? stepIndex - 1 : -1, inferredDoneFromPct, activeIndex - 1);

  return canonicalSteps.map((step, index) => {
    const backendStep = matchedBackend.get(index);
    const backendState = String(backendStep?.state || "").toUpperCase();
    const state =
      backendState === "SUCCEEDED" || backendState === "RUNNING" || backendState === "FAILED"
        ? backendState
        : index <= doneThroughIndex
          ? "SUCCEEDED"
          : index === activeIndex
            ? "RUNNING"
            : "PENDING";
    const inferredRunningPct =
      overallPct != null && index === activeIndex
        ? Math.max(12, Math.min(99, Math.round(((overallPct - activeIndex * perStepPct) / perStepPct) * 100)))
        : undefined;
    const pct =
      typeof backendStep?.progress === "number"
        ? backendStep.progress
        : state === "SUCCEEDED"
          ? 100
          : state === "RUNNING"
            ? inferredRunningPct ?? 55
            : 0;

    return {
      key: step.key,
      label: step.label,
      state,
      detail: typeof backendStep?.message === "string" ? backendStep.message : undefined,
      pct,
    };
  });
}

export function computeAnalyzingProgressPct(
  stepRows: AgentProcessingStep[],
  overallPct?: number | null,
) {
  const derived = Math.round(
    stepRows.length
      ? stepRows.reduce(
          (acc, row) =>
            acc +
            (row.state === "SUCCEEDED"
              ? 100
              : row.state === "RUNNING"
                ? Math.max(0, Math.min(99, Number(row.pct || 55)))
                : 0),
          0,
        ) / stepRows.length
      : 0,
  );
  if (typeof overallPct === "number" && Number.isFinite(overallPct)) {
    return Math.max(derived, Math.max(0, Math.min(100, Math.round(overallPct))));
  }
  return derived;
}

export function computeAnimatedAnalyzingProgressPct(params: {
  stepRows: AgentProcessingStep[];
  overallPct?: number | null;
  startedAtMs?: number | null;
  nowMs?: number;
}) {
  const { stepRows, overallPct, startedAtMs, nowMs = Date.now() } = params;
  const base = computeAnalyzingProgressPct(stepRows, overallPct);
  if (!stepRows.length) return base;
  if (base >= 100) return 100;
  if (typeof startedAtMs !== "number" || !Number.isFinite(startedAtMs)) return base;

  const activeIndex = stepRows.findIndex((row) => row.state === "RUNNING");
  if (activeIndex < 0) return base;

  const perStepPct = 100 / stepRows.length;
  const completedCount = stepRows.filter((row) => row.state === "SUCCEEDED").length;
  const completedBase = completedCount * perStepPct;
  const elapsedSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const projectedWithinStep = Math.min(perStepPct * 0.92, 12 + elapsedSec * 1.8);
  const projected = Math.min(96, Math.round(completedBase + projectedWithinStep));

  return Math.max(base, projected);
}

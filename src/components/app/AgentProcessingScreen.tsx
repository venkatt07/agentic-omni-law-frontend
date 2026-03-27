import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { autoTranslateUiText } from "@/lib/i18n";
import RunConsoleLayout from "@/components/app/run-console/RunConsoleLayout";
import {
  createMockRunState,
  useRunState,
  type RunConsoleData,
  type RunEvidenceItem,
  type RunLogLine,
  type RunNode,
} from "@/components/app/run-console/useRunState";
import { useAppStore } from "@/store";

type StepState = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
type AgentKind = "query" | "contract" | "outcome" | "compliance" | "draft" | "generic";

export interface AgentProcessingStep {
  key: string;
  label: string;
  state: StepState | string;
  detail?: string;
  pct?: number;
}

export interface AgentProcessingMetric {
  label: string;
  value: ReactNode;
  hint?: string;
}

export interface AgentProcessingMetaItem {
  label: string;
  value: ReactNode;
}

export interface AgentProcessingEvidenceItem {
  id: string;
  group: "CURRENT INPUT" | "USER DOC" | "LEGAL CORPUS";
  title: string;
  meta?: string;
  snippet?: string;
  highlight?: string;
}

interface AgentProcessingScreenProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusDetail?: string;
  startedAtMs?: number;
  progressPct?: number;
  steps: AgentProcessingStep[];
  runType?: "single_agent" | "multi_agent";
  metrics?: AgentProcessingMetric[];
  metaItems?: AgentProcessingMetaItem[];
  footerNote?: string;
  action?: ReactNode;
  evidenceItems?: AgentProcessingEvidenceItem[];
  activityHistoryLines?: RunLogLine[];
  activityLines?: RunLogLine[];
  onActivityLinesChange?: (lines: RunLogLine[]) => void;
}

function normalizeState(value: string): RunNode["status"] {
  const normalized = String(value || "").toUpperCase();
  if (["SUCCEEDED", "DONE", "SUCCESS", "CACHED", "COMPLETE"].includes(normalized)) return "done";
  if (["RUNNING", "ACTIVE"].includes(normalized)) return "running";
  if (["FAILED", "ERROR", "ABORTED", "CANCELLED"].includes(normalized)) return "error";
  if (["BLOCKED"].includes(normalized)) return "blocked";
  return "queued";
}

function displayText(value: ReactNode) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "Not set";
}

function detectAgentKind(agentLabel?: string, title?: string) {
  const value = `${agentLabel || ""} ${title || ""}`.toLowerCase();
  if (value.includes("query")) return "query" as const;
  if (value.includes("contract")) return "contract" as const;
  if (value.includes("outcome") || value.includes("prediction")) return "outcome" as const;
  if (value.includes("compliance") || value.includes("policy")) return "compliance" as const;
  if (value.includes("draft")) return "draft" as const;
  return "generic" as const;
}

function inferResultPreview(
  agentKind: AgentKind,
  metrics: AgentProcessingMetric[],
  metaItems: AgentProcessingMetaItem[],
) {
  const metricMap = new Map(metrics.map((metric) => [metric.label.toLowerCase(), displayText(metric.value)]));
  const metaMap = new Map(metaItems.map((item) => [item.label.toLowerCase(), displayText(item.value)]));

  if (agentKind === "query") {
    return [
      { label: "Jurisdiction", value: metaMap.get("jurisdiction") || "Auto detect" },
      { label: "Source scope", value: metaMap.get("search scope") || metaMap.get("source scope") || "Workspace" },
    ];
  }
  if (agentKind === "contract") {
    return [
      { label: "Clauses found", value: metricMap.get("clauses") || "0" },
      { label: "Risks flagged", value: metricMap.get("risks") || "0" },
    ];
  }
  if (agentKind === "outcome") {
    return [
      { label: "Similar cases", value: metricMap.get("similar cases") || "0" },
      { label: "Precedents", value: metricMap.get("precedents") || "0" },
    ];
  }
  if (agentKind === "compliance") {
    return [
      { label: "Review scope", value: metaMap.get("scope") || "Compliance review" },
      { label: "Source scope", value: metaMap.get("source scope") || "Workspace" },
    ];
  }
  if (agentKind === "draft") {
    return [
      { label: "Template", value: metricMap.get("template") || "Draft template" },
      { label: "Validation", value: metaMap.get("validation") || "Evidence-grounded" },
    ];
  }
  return metrics.slice(0, 2).map((metric) => ({ label: metric.label, value: displayText(metric.value) }));
}

function buildNodes(
  title: string,
  steps: AgentProcessingStep[],
  metrics: AgentProcessingMetric[],
  metaItems: AgentProcessingMetaItem[],
  runType: "single_agent" | "multi_agent",
  agentKind: AgentKind,
  subtitle?: string,
  statusDetail?: string,
) {
  if (runType === "single_agent") {
    const normalizedSteps = steps.map((step) => normalizeState(step.state));
    const hasError = normalizedSteps.includes("error");
    const hasRunning = normalizedSteps.includes("running");
    const allDone = normalizedSteps.length > 0 && normalizedSteps.every((state) => state === "done");
    return [
      {
        key: "focused-agent",
        label: title,
        description: statusDetail || subtitle || "The agent is processing the active case workspace.",
        status: hasError ? "error" : hasRunning ? "running" : allDone ? "done" : "queued",
        progress:
          typeof steps.find((step) => typeof step.pct === "number")?.pct === "number"
            ? steps.find((step) => typeof step.pct === "number")?.pct
            : undefined,
        resultPreview: allDone ? inferResultPreview(agentKind, metrics, metaItems) : undefined,
      },
    ] satisfies RunNode[];
  }

  return steps.map((step) => ({
    key: step.key,
    label: step.label,
    description: step.detail || "No additional detail available.",
    status: normalizeState(step.state),
    progress: typeof step.pct === "number" ? step.pct : undefined,
    resultPreview: normalizeState(step.state) === "done" ? inferResultPreview(agentKind, metrics, metaItems) : undefined,
  })) satisfies RunNode[];
}

function inferDocumentContext(metaItems: AgentProcessingMetaItem[], evidenceItems: AgentProcessingEvidenceItem[]) {
  const documentSource =
    metaItems.find((item) => /document source|source document|draft source/i.test(item.label))?.value ||
    evidenceItems.find((item) => item.group === "USER DOC")?.title ||
    evidenceItems.find((item) => item.group === "CURRENT INPUT")?.title ||
    null;
  const pages =
    metaItems.find((item) => /pages/i.test(item.label))?.value ||
    evidenceItems.find((item) => /pages/i.test(String(item.meta || "")))?.meta ||
    null;
  return {
    documentSource: displayText(documentSource),
    pages: displayText(pages),
  };
}

function buildStageSummary(step: AgentProcessingStep, agentKind: AgentKind) {
  const normalized = String(step.label || "").toLowerCase();

  if (agentKind === "contract") {
    if (normalized.includes("scope") || normalized.includes("parse")) {
      return {
        phase: "Reading contract",
        title: "Mapping the contract structure",
        detail: step.detail || "Reviewing the agreement layout, parties, and section flow before risk scoring begins.",
        next: "Extract the clauses that matter for exposure review.",
      };
    }
    if (normalized.includes("clause") || normalized.includes("extract")) {
      return {
        phase: "Reading contract",
        title: "Extracting key clauses",
        detail: step.detail || "Pulling payment, liability, indemnity, termination, and dispute clauses from the agreement.",
        next: "Scan the contract for material risk signals.",
      };
    }
    if (normalized.includes("risk")) {
      return {
        phase: "Risk review",
        title: "Checking contract risk signals",
        detail: step.detail || "Looking for one-sided terms, liability exposure, escalation triggers, and negotiation risks.",
        next: "Review which protections are missing.",
      };
    }
    if (normalized.includes("missing")) {
      return {
        phase: "Reviewing gaps",
        title: "Checking for missing protections",
        detail: step.detail || "Reviewing whether key fallback clauses, limitation language, and dispute safeguards are missing.",
        next: "Prepare the contract risk summary.",
      };
    }
    if (normalized.includes("generate") || normalized.includes("response") || normalized.includes("report")) {
      return {
        phase: "Writing summary",
        title: "Preparing the contract risk report",
        detail: step.detail || "Turning clause findings and exposure signals into a clear contract risk review.",
        next: "Save the report to the case workspace.",
      };
    }
  }

  if (agentKind === "outcome") {
    if (normalized.includes("fact") || normalized.includes("analyz")) {
      return {
        phase: "Reviewing facts",
        title: "Breaking down the case facts",
        detail: step.detail || "Separating timeline, claims, defenses, and procedural posture before estimating outcomes.",
        next: "Find comparable matters and prior outcomes.",
      };
    }
    if (normalized.includes("similar") || normalized.includes("search")) {
      return {
        phase: "Researching patterns",
        title: "Finding similar matters",
        detail: step.detail || "Looking for comparable case patterns, relief requests, and litigation signals that inform likely outcomes.",
        next: "Compare the strongest precedents.",
      };
    }
    if (normalized.includes("precedent") || normalized.includes("evaluate")) {
      return {
        phase: "Comparing precedents",
        title: "Weighing relevant precedents",
        detail: step.detail || "Comparing supportive and adverse authority to understand how the current matter may be treated.",
        next: "Estimate the likely outcome range.",
      };
    }
    if (normalized.includes("distribution") || normalized.includes("probab") || normalized.includes("calculate")) {
      return {
        phase: "Estimating outcome",
        title: "Estimating the outcome range",
        detail: step.detail || "Balancing facts, precedent strength, and timing pressure to estimate the most likely result bands.",
        next: "Prepare the outcome report.",
      };
    }
    if (normalized.includes("generate") || normalized.includes("report")) {
      return {
        phase: "Writing summary",
        title: "Preparing the outcome report",
        detail: step.detail || "Packaging the prediction narrative, key drivers, and probability view for review.",
        next: "Save the prediction to the workspace.",
      };
    }
  }

  if (agentKind === "compliance") {
    if (normalized.includes("requirement") || normalized.includes("intent") || normalized.includes("parse")) {
      return {
        phase: "Reading requirements",
        title: "Understanding the compliance request",
        detail: step.detail || "Reading the matter to understand which obligations, controls, and compliance questions apply.",
        next: "Identify the relevant frameworks.",
      };
    }
    if (normalized.includes("framework") || normalized.includes("identify")) {
      return {
        phase: "Mapping frameworks",
        title: "Identifying applicable frameworks",
        detail: step.detail || "Matching the matter to the governing policy, statutory, and regulatory frameworks.",
        next: "Check the detailed rules and obligations.",
      };
    }
    if (normalized.includes("rule") || normalized.includes("search")) {
      return {
        phase: "Checking rules",
        title: "Reviewing compliance rules",
        detail: step.detail || "Checking the relevant rules, internal policy duties, and legal obligations against the case facts.",
        next: "Assess where the compliance gaps are.",
      };
    }
    if (normalized.includes("risk") || normalized.includes("evaluate")) {
      return {
        phase: "Assessing exposure",
        title: "Assessing compliance risk",
        detail: step.detail || "Judging the severity of likely breaches, missing controls, and enforcement exposure.",
        next: "Prepare the compliance summary.",
      };
    }
    if (normalized.includes("generate") || normalized.includes("report") || normalized.includes("response")) {
      return {
        phase: "Writing summary",
        title: "Preparing the compliance report",
        detail: step.detail || "Organizing framework findings, risk levels, and remediation guidance into a clear compliance view.",
        next: "Save the compliance report.",
      };
    }
  }

  if (agentKind === "draft") {
    if (normalized.includes("template") || normalized.includes("parse")) {
      return {
        phase: "Reading template",
        title: "Interpreting the draft template",
        detail: step.detail || "Reviewing the selected template structure, mandatory sections, and drafting instructions.",
        next: "Pull the facts needed for the draft.",
      };
    }
    if (normalized.includes("fact") || normalized.includes("extract")) {
      return {
        phase: "Reading workspace",
        title: "Collecting case facts for the draft",
        detail: step.detail || "Pulling names, dates, issues, and factual anchors that must appear in the draft.",
        next: "Retrieve supporting evidence and references.",
      };
    }
    if (normalized.includes("evidence") || normalized.includes("snippet") || normalized.includes("retrieve") || normalized.includes("search")) {
      return {
        phase: "Gathering support",
        title: "Gathering supporting material",
        detail: step.detail || "Collecting the evidence snippets and supporting references needed to ground the draft.",
        next: "Validate draft quality and completeness.",
      };
    }
    if (normalized.includes("valid") || normalized.includes("quality")) {
      return {
        phase: "Validating draft",
        title: "Checking draft quality",
        detail: step.detail || "Reviewing whether the draft stays consistent with the case facts, requested format, and supporting material.",
        next: "Prepare the final draft output.",
      };
    }
    if (normalized.includes("generate") || normalized.includes("draft")) {
      return {
        phase: "Drafting",
        title: "Preparing the final draft",
        detail: step.detail || "Assembling the final legal draft so it is ready for review and editing.",
        next: "Publish the draft to the workspace.",
      };
    }
  }

  if (normalized.includes("query") || normalized.includes("intent")) {
    return {
      phase: "Thinking",
      title: "Parsing legal intent",
      detail: step.detail || "Separating facts, parties, dates, and legal issues from the submitted matter.",
      next: "Continue structuring the legal analysis.",
    };
  }
  if (normalized.includes("language") || normalized.includes("jurisdiction")) {
    return {
      phase: "Reading documents",
      title: "Validating language and jurisdiction",
      detail: step.detail || "Checking language, forum, and territorial signals before the run continues.",
      next: "Lock the legal scope for retrieval and analysis.",
    };
  }
  if (normalized.includes("domain")) {
    return {
      phase: "Thinking",
      title: "Classifying legal domain",
      detail: step.detail || "Matching the case signals to the right legal domain and issue family.",
      next: "Refine the active workspace path.",
    };
  }
  if (normalized.includes("extract")) {
    return {
      phase: "Reading documents",
      title: "Extracting facts and evidence",
      detail: step.detail || "Pulling facts, dates, parties, obligations, and supporting evidence from the workspace.",
      next: "Assemble structured case context.",
    };
  }
  if (normalized.includes("prepare")) {
    return {
      phase: "Planning next",
      title: "Preparing structured case context",
      detail: step.detail || "Consolidating the current facts and reasoning into the active workspace format.",
      next: "Finalize the current analysis context.",
    };
  }

  return {
    phase: "Working",
    title: step.label,
    detail: step.detail || "Executing the current stage of the legal workflow.",
    next: "Continue to the next runtime action.",
  };
}

function buildLogs(
  steps: AgentProcessingStep[],
  metaItems: AgentProcessingMetaItem[],
  evidenceItems: AgentProcessingEvidenceItem[],
  runType: "single_agent" | "multi_agent",
  nodeKey = "focused-agent",
  agentLabel?: string,
  title?: string,
  baseMs = Date.now(),
) {
  const { documentSource, pages } = inferDocumentContext(metaItems, evidenceItems);
  const agentKind = detectAgentKind(agentLabel, title);
  const hasGroundingContext = documentSource !== "Not set";

  if (runType === "single_agent") {
    const transcript = steps.flatMap((step, index) => {
      const ts = new Date(baseMs - (steps.length - index) * 1400);
      const stamp = ts.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const status = normalizeState(step.state);
      const summary = buildStageSummary(step, agentKind);
      const readingPhase = [
        "Reading documents",
        "Reading workspace",
        "Reading contract",
        "Reading template",
        "Reading requirements",
      ].includes(summary.phase);

      const detail =
        hasGroundingContext && readingPhase
          ? `${summary.detail} Grounding against ${documentSource}${pages !== "Not set" ? ` (${pages})` : ""}.`
          : summary.detail;

      return [
        {
          id: `${step.key}-primary`,
          timestamp: stamp,
          actor: agentLabel || "Agent",
          phase: summary.phase,
          text: summary.title,
          detail,
          next: summary.next,
          tone: status === "error" ? "error" : status === "done" ? "success" : status === "running" ? "live" : "neutral",
          state:
            status === "error"
              ? "error"
              : status === "done"
                ? "completed"
                : status === "running"
                  ? "active"
                  : "upcoming",
        },
      ] satisfies RunLogLine[];
    });

    return {
      [nodeKey]: transcript,
    } as Record<string, RunLogLine[]>;
  }

  return Object.fromEntries(
    steps.map((step, index) => {
      const ts = new Date(baseMs - (steps.length - index) * 1500);
      const stamp = ts.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const status = normalizeState(step.state);
      const summary = buildStageSummary(step, agentKind);
      const detail =
        status === "running" && hasGroundingContext
          ? `${summary.detail} Reading ${documentSource}${pages !== "Not set" ? ` (${pages})` : ""}.`
          : summary.detail;

      return [
        step.key,
        [
          {
            id: `${step.key}-line-0`,
            timestamp: stamp,
            actor: step.label,
            phase: summary.phase,
            text: summary.title,
            detail,
            next: summary.next,
            tone: status === "error" ? "error" : status === "done" ? "success" : status === "running" ? "live" : "neutral",
            state:
              status === "error"
                ? "error"
                : status === "done"
                  ? "completed"
                  : status === "running"
                    ? "active"
                    : "upcoming",
          },
        ],
      ];
    }),
  ) as Record<string, RunLogLine[]>;
}

function buildDefaultEvidence(metaItems: AgentProcessingMetaItem[]) {
  const workspace = metaItems.find((item) => /workspace/i.test(item.label));
  const documentSource = metaItems.find((item) => /document source|draft source/i.test(item.label));
  const sources = metaItems.find((item) => /sources|source scope/i.test(item.label));
  return [
    workspace
      ? {
          id: "workspace",
          group: "CURRENT INPUT" as const,
          title: displayText(workspace.value),
          meta: workspace.label,
          snippet: "Active workspace attached to the current run.",
        }
      : null,
    documentSource
      ? {
          id: "document-source",
          group: "USER DOC" as const,
          title: displayText(documentSource.value),
          meta: documentSource.label,
          snippet: "Primary user material attached for this run.",
        }
      : null,
    sources
      ? {
          id: "sources",
          group: "LEGAL CORPUS" as const,
          title: displayText(sources.value),
          meta: sources.label,
          snippet: "Configured legal source set for this run.",
        }
      : null,
  ].filter(Boolean) as RunEvidenceItem[];
}

function getActivityAnchorIndex(lines: RunLogLine[]) {
  const activeIndex = lines.findIndex((line) => line.state === "active" || line.state === "error");
  if (activeIndex >= 0) return activeIndex;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.state === "completed") return index;
  }
  return lines.length ? 0 : -1;
}

export default function AgentProcessingScreen({
  eyebrow = "Agent runtime",
  title,
  subtitle,
  statusLabel,
  statusDetail,
  startedAtMs,
  progressPct = 0,
  steps,
  runType = "single_agent",
  metrics = [],
  metaItems = [],
  footerNote,
  action,
  evidenceItems = [],
  activityHistoryLines,
  activityLines,
  onActivityLinesChange,
}: AgentProcessingScreenProps) {
  const { t } = useI18n();
  const language = useAppStore((state) => state.language);
  const translateUi = (value: string) => autoTranslateUiText(value, language);
  const [elapsedSec, setElapsedSec] = useState(0);
  const fallbackStartedAtRef = useRef(
    typeof startedAtMs === "number" && Number.isFinite(startedAtMs) ? startedAtMs : Date.now(),
  );
  const transcriptBaseRef = useRef(Date.now());

  useEffect(() => {
    if (typeof startedAtMs === "number" && Number.isFinite(startedAtMs)) {
      fallbackStartedAtRef.current = startedAtMs;
      transcriptBaseRef.current = startedAtMs;
    }
  }, [startedAtMs]);

  const resolvedStartedAtMs =
    typeof startedAtMs === "number" && Number.isFinite(startedAtMs)
      ? startedAtMs
      : fallbackStartedAtRef.current;
  const caseTitle =
    displayText(metaItems.find((item) => /workspace|case|draft source/i.test(item.label))?.value) ||
    title ||
    eyebrow;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - resolvedStartedAtMs) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resolvedStartedAtMs]);

  const fallbackElapsedLabel = elapsedSec >= 60
    ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
    : `${elapsedSec}s`;

  const agentLabel = eyebrow && eyebrow !== "Agent runtime" ? eyebrow : title || statusLabel || eyebrow;
  const nodeTitle = runType === "single_agent" ? agentLabel || title || eyebrow : title || eyebrow;
  const agentKind = detectAgentKind(agentLabel, title);
  const nodes = buildNodes(nodeTitle, steps, metrics, metaItems, runType, agentKind, subtitle, statusDetail);
  const activeKey =
    nodes.find((node) => node.status === "running")?.key ||
    nodes.find((node) => node.status === "error")?.key ||
    nodes[0]?.key;

  const runtimeEvidence = evidenceItems.length ? evidenceItems : buildDefaultEvidence(metaItems);
  const generatedLogsByNode = buildLogs(
    steps,
    metaItems,
    runtimeEvidence,
    runType,
    activeKey,
    agentLabel,
    title,
    transcriptBaseRef.current,
  );
  const generatedActiveLogs = activeKey ? generatedLogsByNode[activeKey] || [] : [];
  const generatedTranscriptSessionKey = [
    runType,
    activeKey || "",
    String(resolvedStartedAtMs),
    steps.map((step) => step.key).join("|"),
  ].join("::");
  const generatedTranscriptSessionRef = useRef("");
  const [generatedActivityLines, setGeneratedActivityLines] = useState<RunLogLine[]>([]);

  useEffect(() => {
    if (activityLines?.length || runType !== "single_agent") {
      generatedTranscriptSessionRef.current = "";
      setGeneratedActivityLines([]);
      return;
    }

    setGeneratedActivityLines((current) => {
      if (!generatedActiveLogs.length) return [];
      const sourceIndexById = new Map(generatedActiveLogs.map((line, index) => [line.id, index]));
      const anchorIndex = getActivityAnchorIndex(generatedActiveLogs);
      if (anchorIndex < 0) return [];

      if (
        generatedTranscriptSessionRef.current !== generatedTranscriptSessionKey ||
        current.length === 0
      ) {
        generatedTranscriptSessionRef.current = generatedTranscriptSessionKey;
        return [generatedActiveLogs[anchorIndex]];
      }

      const currentIds = current
        .map((line) => line.id)
        .filter((id) => sourceIndexById.has(id));
      const lastVisibleIndex = currentIds.length
        ? Math.max(...currentIds.map((id) => sourceIndexById.get(id) ?? -1))
        : -1;

      const nextIds = [...currentIds];
      if (anchorIndex > lastVisibleIndex) {
        for (let index = Math.max(0, lastVisibleIndex + 1); index <= anchorIndex; index += 1) {
          const id = generatedActiveLogs[index]?.id;
          if (id && !nextIds.includes(id)) nextIds.push(id);
        }
      } else {
        const anchorId = generatedActiveLogs[anchorIndex]?.id;
        if (anchorId && !nextIds.includes(anchorId)) {
          nextIds.push(anchorId);
        }
      }

      const nextVisibleIdSet = new Set(nextIds);
      const nextLines = generatedActiveLogs.filter((line) => nextVisibleIdSet.has(line.id));
      return nextLines.length ? nextLines : [generatedActiveLogs[anchorIndex]];
    });
  }, [activityLines, generatedActiveLogs, generatedTranscriptSessionKey, runType]);

  const resolvedActivityLines = useMemo(() => {
    const baseLines =
      activityLines?.length
        ? activityLines
        : runType === "single_agent"
          ? generatedActivityLines
          : [];
    const merged = [...(activityHistoryLines || []), ...baseLines].filter(
      (line, index, arr) => arr.findIndex((candidate) => candidate.id === line.id) === index,
    );
    return merged.length ? merged : undefined;
  }, [activityHistoryLines, activityLines, generatedActivityLines, runType]);

  useEffect(() => {
    if (!resolvedActivityLines?.length || !onActivityLinesChange) return;
    onActivityLinesChange(resolvedActivityLines);
  }, [onActivityLinesChange, resolvedActivityLines]);

  const runData: RunConsoleData = {
    caseTitle,
    statusLabel: translateUi(statusLabel || (nodes.some((node) => node.status === "error") ? t("run.issue") : t("run.processing"))),
    elapsedLabel: (
      metrics.find((metric) => /elapsed/i.test(metric.label))?.value != null
        ? displayText(metrics.find((metric) => /elapsed/i.test(metric.label))?.value)
        : metaItems.find((item) => /elapsed/i.test(item.label))?.value != null
          ? displayText(metaItems.find((item) => /elapsed/i.test(item.label))?.value)
          : ""
    ) || fallbackElapsedLabel,
    subtitle: translateUi(subtitle || statusDetail || "Agents are processing the current workspace."),
    overallProgress: progressPct,
    footerNote,
    action,
    runType,
    railLabel: translateUi(runType === "single_agent" ? agentLabel || "Active agent" : "Pipeline"),
    nodes: nodes.map((node) => ({
      ...node,
      label: translateUi(node.label),
      description: node.description ? translateUi(node.description) : node.description,
      resultPreview: node.resultPreview?.map((item) => ({
        label: translateUi(item.label),
        value: translateUi(item.value),
      })),
    })),
    activeKey,
    activityLogs: resolvedActivityLines,
    logsByNode: generatedLogsByNode,
    evidenceByNode: Object.fromEntries(nodes.map((node) => [node.key, runtimeEvidence])),
  };

  const state = useRunState(runData);

  if (!steps.length) {
    return <RunConsoleLayout state={useRunState(createMockRunState({ caseTitle, subtitle }))} />;
  }

  return <RunConsoleLayout state={state} />;
}

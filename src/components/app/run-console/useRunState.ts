import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";

export type RunNodeStatus = "queued" | "running" | "done" | "error" | "blocked";
export type EvidenceGroup = "CURRENT INPUT" | "USER DOC" | "LEGAL CORPUS";

export interface RunNode {
  key: string;
  label: string;
  description?: string;
  status: RunNodeStatus;
  progress?: number;
  resultPreview?: Array<{ label: string; value: string }>;
}

export interface RunLogLine {
  id: string;
  timestamp?: string;
  text: string;
  tone?: "neutral" | "live" | "success" | "error";
  state?: "completed" | "active" | "upcoming" | "error";
  actor?: string;
  phase?: string;
  detail?: string;
  next?: string;
}

export interface RunEvidenceItem {
  id: string;
  group: EvidenceGroup;
  title: string;
  meta?: string;
  snippet?: string;
  highlight?: string;
}

export interface RunConsoleData {
  caseTitle: string;
  statusLabel: string;
  elapsedLabel: string;
  subtitle?: string;
  overallProgress?: number;
  footerNote?: string;
  action?: ReactNode;
  runType?: "single_agent" | "multi_agent";
  railLabel?: string;
  nodes: RunNode[];
  activeKey?: string;
  activityLogs?: RunLogLine[];
  logsByNode?: Record<string, RunLogLine[]>;
  evidenceByNode?: Record<string, RunEvidenceItem[]>;
  reportHrefByNode?: Record<string, string>;
}

function normalizeStatus(value: string): RunNodeStatus {
  const normalized = String(value || "").toLowerCase();
  if (["done", "success", "succeeded", "complete", "completed", "cached"].includes(normalized)) return "done";
  if (["running", "active", "live"].includes(normalized)) return "running";
  if (["error", "failed"].includes(normalized)) return "error";
  if (["blocked"].includes(normalized)) return "blocked";
  return "queued";
}

function formatTimestamp(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function buildDefaultLogs(nodes: RunNode[]) {
  const now = Date.now();
  return Object.fromEntries(
    nodes.map((node, index) => {
      const label = node.label;
      const base = new Date(now - (nodes.length - index) * 1800);
      const lines: RunLogLine[] = [
        {
          id: `${node.key}-0`,
          timestamp: formatTimestamp(base),
          actor: label,
          phase: "Queued",
          text: "Stage accepted into runtime",
          detail: `${label} entered the shared agent pipeline for the active case.`,
          next: "Initialize the stage workspace.",
          tone: node.status === "error" ? "error" : node.status === "done" ? "success" : "neutral",
        },
        {
          id: `${node.key}-1`,
          timestamp: formatTimestamp(new Date(base.getTime() + 700)),
          actor: label,
          phase: node.key === "query_parsing" ? "Reading documents" : "Reading workspace",
          text: node.key === "query_parsing" ? "Reading issue text and attached documents" : "Syncing the parsed case context",
          detail:
            node.description ||
            (node.key === "query_parsing"
              ? "Collecting raw text, uploaded documents, and jurisdiction cues before routing the case."
              : "Pulling facts, issue groups, and prior agent signals from the shared case workspace."),
          next: "Normalize facts and evidence anchors.",
          tone: node.status === "queued" ? "neutral" : "live",
        },
        {
          id: `${node.key}-2`,
          timestamp: formatTimestamp(new Date(base.getTime() + 1400)),
          actor: label,
          phase: "Thinking",
          text: node.key === "query_parsing" ? "Structuring the legal issue" : "Evaluating the current stage",
          detail:
            node.key === "query_parsing"
              ? "Separating facts, parties, dates, jurisdiction, and issue groups from the submitted matter."
              : "Transforming the structured case context into agent-specific reasoning for the current stage.",
          next: "Build the next stage output.",
          tone: node.status === "queued" ? "neutral" : "live",
        },
        {
          id: `${node.key}-3`,
          timestamp: formatTimestamp(new Date(base.getTime() + 2100)),
          actor: label,
          phase: "Reasoning",
          text: "Preparing runtime output",
          detail: "Shaping the current stage result so it can be saved and handed off cleanly.",
          next: "Validate and persist the stage output.",
          tone: node.status === "queued" ? "neutral" : "live",
        },
      ];
      if (node.status === "done") {
        lines.push({
          id: `${node.key}-4`,
          timestamp: formatTimestamp(new Date(base.getTime() + 2800)),
          actor: label,
          phase: "Done",
          text: "Output saved to workspace",
          detail: "Structured agent output has been committed to the active case workspace.",
          next: "Continue into the next agent stage.",
          tone: "success",
        });
      } else if (node.status === "error") {
        lines.push({
          id: `${node.key}-4`,
          timestamp: formatTimestamp(new Date(base.getTime() + 2800)),
          actor: label,
          phase: "Issue",
          text: "Run failed and needs retry",
          detail: "The agent hit a runtime failure before completing the current stage.",
          next: "Retry from the same workspace context.",
          tone: "error",
        });
      } else if (node.status === "running") {
        lines.push({
          id: `${node.key}-4`,
          timestamp: formatTimestamp(new Date(base.getTime() + 2800)),
          actor: label,
          phase: "Next",
          text: "Preparing the next runtime action",
          detail: "The current stage is still active and will continue streaming progress into the transcript.",
          next: "Continue runtime execution.",
          tone: "live",
        });
      }
      return [node.key, lines];
    }),
  ) as Record<string, RunLogLine[]>;
}

function buildDefaultEvidence(caseTitle: string, nodes: RunNode[]) {
  return Object.fromEntries(
    nodes.map((node) => [
      node.key,
      [
        {
          id: `${node.key}-input`,
          group: "CURRENT INPUT" as const,
          title: caseTitle || "Current workspace",
          meta: "Active case",
          snippet: node.description || "Live case context is attached to this run.",
        },
      ],
    ]),
  ) as Record<string, RunEvidenceItem[]>;
}

function buildDefaultReportHref(pathname: string, search: string, nodes: RunNode[]) {
  const params = new URLSearchParams(search);
  const caseIdFromQuery = params.get("caseId") || "";
  const routeCaseId = pathname.match(/\/app\/cases\/([^/]+)/)?.[1] || caseIdFromQuery;
  const caseId = decodeURIComponent(routeCaseId || "");
  if (!caseId) return {};

  const map: Record<string, string> = {};
  for (const node of nodes) {
    switch (node.key) {
      case "query_parsing":
        map[node.key] = `/app/agents/query/result?caseId=${encodeURIComponent(caseId)}`;
        break;
      case "contract_risk_dispute_settlement":
        map[node.key] = `/app/cases/${encodeURIComponent(caseId)}/agents/contract-risk/results`;
        break;
      case "case_outcome_deadline_penalty":
        map[node.key] = `/app/cases/${encodeURIComponent(caseId)}/agents/case-outcome/results`;
        break;
      case "policy_compliance":
        map[node.key] = `/app/cases/${encodeURIComponent(caseId)}/agents/policy-compliance/results`;
        break;
      case "legal_drafts_validation":
        map[node.key] = `/app/cases/${encodeURIComponent(caseId)}/agents/legal-drafts`;
        break;
      default:
        if (node.key.includes("_")) {
          map[node.key] = `/app/cases/${encodeURIComponent(caseId)}/agents/role/${encodeURIComponent(node.key)}`;
        }
        break;
    }
  }

  if (pathname.includes("/agents/query/loading")) {
    map.query_parsing = `/app/agents/query/result?caseId=${encodeURIComponent(caseId)}`;
  }
  if (pathname.includes("/agents/contract-risk/analyzing")) {
    map.contract_risk_dispute_settlement = `/app/cases/${encodeURIComponent(caseId)}/agents/contract-risk/results`;
  }
  if (pathname.includes("/agents/case-outcome/analyzing")) {
    map.case_outcome_deadline_penalty = `/app/cases/${encodeURIComponent(caseId)}/agents/case-outcome/results`;
  }
  if (pathname.includes("/agents/policy-compliance/analyzing")) {
    map.policy_compliance = `/app/cases/${encodeURIComponent(caseId)}/agents/policy-compliance/results`;
  }
  if (pathname.includes("/agents/legal-drafts/") && pathname.includes("/analyzing")) {
    map.legal_drafts_validation = `/app/cases/${encodeURIComponent(caseId)}/agents/legal-drafts`;
  }
  return map;
}

export function createMockRunState(overrides?: Partial<RunConsoleData>): RunConsoleData {
  const nodes: RunNode[] = [
    { key: "query_parsing", label: "Query Parsing", description: "Parsing legal intent, facts, and jurisdiction signals.", status: "running", progress: 78, resultPreview: [{ label: "Domain", value: "Employment" }] },
    { key: "contract_risk_dispute_settlement", label: "Contract Risk", description: "Reviewing clause exposure and dispute positions.", status: "queued", progress: 0 },
    { key: "case_outcome_deadline_penalty", label: "Outcome Prediction", description: "Estimating outcome direction and timeline pressure.", status: "queued", progress: 0 },
    { key: "policy_compliance", label: "Policy Compliance", description: "Checking statutory and workplace compliance issues.", status: "queued", progress: 0 },
    { key: "legal_drafts_validation", label: "Legal Drafts", description: "Preparing draft-ready legal output from workspace facts.", status: "queued", progress: 0 },
    { key: "output", label: "Output", description: "Assembling the final report surface for review.", status: "queued", progress: 0 },
  ];
  return {
    caseTitle: "Current Case Workspace",
    statusLabel: "Processing",
    elapsedLabel: "12s",
    subtitle: "Query Parsing runs first. Downstream agents start after the parsed workspace is ready.",
    overallProgress: 58,
    runType: "multi_agent",
    railLabel: "Pipeline",
    nodes,
    activeKey: "query_parsing",
    activityLogs: buildDefaultLogs(nodes).query_parsing,
    logsByNode: buildDefaultLogs(nodes),
    evidenceByNode: buildDefaultEvidence("Current Case Workspace", nodes),
    reportHrefByNode: {},
    ...overrides,
  };
}

export function useRunState(input: RunConsoleData) {
  const [location] = useLocation();
  const pathname = location.split("?")[0] || location;
  const search = typeof window !== "undefined" ? window.location.search : location.includes("?") ? `?${location.split("?")[1]}` : "";
  const nodes = useMemo(
    () =>
      input.nodes.map<RunNode>((node) => ({
        ...node,
        status: normalizeStatus(node.status),
      })),
    [input.nodes],
  );

  const inferredActiveKey =
    input.activeKey ||
    nodes.find((node) => node.status === "running")?.key ||
    nodes.find((node) => node.status === "error")?.key ||
    nodes.find((node) => node.status === "done")?.key ||
    nodes[0]?.key;

  const [selectedKey, setSelectedKey] = useState(inferredActiveKey);
  const [compactMode, setCompactMode] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);

  useEffect(() => {
    setSelectedKey((prev) => {
      const prevExists = prev && nodes.some((node) => node.key === prev);
      const prevStatus = prevExists ? nodes.find((node) => node.key === prev)?.status : null;
      const inferredStatus = nodes.find((node) => node.key === inferredActiveKey)?.status || null;
      const shouldFollowLiveAgent =
        inferredActiveKey &&
        inferredActiveKey !== prev &&
        (inferredStatus === "running" || inferredStatus === "error" || (prevStatus !== "running" && prevStatus !== "error"));

      if (shouldFollowLiveAgent) return inferredActiveKey;
      return prevExists ? prev : inferredActiveKey;
    });
  }, [inferredActiveKey, nodes]);

  const selectedNode = nodes.find((node) => node.key === selectedKey) || nodes[0];
  const logsByNode = input.logsByNode && Object.keys(input.logsByNode).length ? input.logsByNode : buildDefaultLogs(nodes);
  const evidenceByNode =
    input.evidenceByNode && Object.keys(input.evidenceByNode).length
      ? input.evidenceByNode
      : buildDefaultEvidence(input.caseTitle, nodes);
  const reportHrefByNode =
    input.reportHrefByNode && Object.keys(input.reportHrefByNode).length
      ? input.reportHrefByNode
      : buildDefaultReportHref(pathname, search, nodes);

  const consoleLogs = (input.activityLogs?.length
    ? input.activityLogs
    : Object.values(logsByNode)
        .flat()
        .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || ""))));
  const evidenceItems = evidenceByNode[selectedNode?.key || ""] || [];
  const completedCount = nodes.filter((node) => node.status === "done").length;
  const hasFailures = nodes.some((node) => node.status === "error");

  return {
    caseTitle: input.caseTitle,
    statusLabel: input.statusLabel,
    elapsedLabel: input.elapsedLabel,
    subtitle: input.subtitle,
    overallProgress: input.overallProgress,
    footerNote: input.footerNote,
    action: input.action,
    runType: input.runType || "multi_agent",
    railLabel: input.railLabel || (input.runType === "single_agent" ? "Active agent" : "Pipeline"),
    nodes,
    selectedKey,
    setSelectedKey,
    selectedNode,
    compactMode,
    setCompactMode,
    evidenceOpen,
    setEvidenceOpen,
    logs: consoleLogs,
    evidenceItems,
    reportHref: selectedNode ? reportHrefByNode[selectedNode.key] : undefined,
    completedCount,
    hasFailures,
  };
}

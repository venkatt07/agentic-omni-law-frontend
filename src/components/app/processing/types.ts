import type { ReactNode } from "react";

export type WorkspacePhaseState = "complete" | "active" | "upcoming";
export type AgentNodeState = "queued" | "initializing" | "retrieving" | "reasoning" | "validating" | "complete" | "failed";
export type ActivityEventTone = "info" | "success" | "warning" | "validation" | "completion";

export interface WorkspacePhase {
  key: string;
  label: string;
  state: WorkspacePhaseState;
  summary?: string;
}

export interface AgentNodeData {
  id: string;
  name: string;
  action: string;
  state: AgentNodeState;
  detail?: string;
  evidenceLabel?: string;
  evidenceCount?: number | string;
  emphasis?: "lead" | "support";
}

export interface ActivityEvent {
  id: string;
  tone: ActivityEventTone;
  agent: string;
  summary: string;
  meta?: string;
  chips?: string[];
}

export interface EvidenceItem {
  key: string;
  label: string;
  value: ReactNode;
  hint?: string;
}

export interface SummaryItem {
  label: string;
  value: ReactNode;
  hint?: string;
}

import { useAppStore } from "@/store";
import { caseService, type CaseDetailsResponse } from "@/services/caseService";
import { roleAgentsService } from "@/services/roleAgentsService";

type NavigateFn = (href: string, opts?: any) => void;

function encodeCaseId(caseId: string) {
  return encodeURIComponent(caseId);
}

function hasStructuredPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter((key) => {
    const normalized = String(key || "").toLowerCase();
    return !["qa_debug", "debug", "metadata", "provenance", "run_id", "status"].includes(normalized);
  });
  return keys.some((key) => {
    const candidate = record[key];
    if (candidate == null) return false;
    if (Array.isArray(candidate)) return candidate.length > 0;
    if (typeof candidate === "object") return Object.keys(candidate as Record<string, unknown>).length > 0;
    if (typeof candidate === "string") return candidate.trim().length > 0;
    return true;
  });
}

function getCaseTitle(details: CaseDetailsResponse | null | undefined, fallbackTitle?: string) {
  return String(details?.title || fallbackTitle || "Case Workspace").trim() || "Case Workspace";
}

async function safeFetchCase(caseId: string) {
  try {
    return await caseService.fetchCase(caseId);
  } catch {
    return null;
  }
}

async function resolveQueryParsingHref(caseId: string) {
  const details = await safeFetchCase(caseId);
  if (hasStructuredPayload(details?.outputs?.query_parsing)) {
    return `/app/agents/query/result?caseId=${encodeCaseId(caseId)}`;
  }
  return `/app/cases/${encodeCaseId(caseId)}/agents/query-parsing`;
}

async function resolveContractRiskHref(caseId: string) {
  return `/app/cases/${encodeCaseId(caseId)}/agents/contract-risk`;
}

async function resolveOutcomeHref(caseId: string) {
  return `/app/cases/${encodeCaseId(caseId)}/agents/case-outcome`;
}

async function resolvePolicyComplianceHref(caseId: string) {
  return `/app/cases/${encodeCaseId(caseId)}/agents/policy-compliance`;
}

async function resolveLegalDraftsHref(caseId: string) {
  return `/app/cases/${encodeCaseId(caseId)}/agents/legal-drafts`;
}

async function resolveRoleAgentHref(caseId: string, agentKey: string) {
  try {
    await roleAgentsService.getMeta(caseId, agentKey);
  } catch {}
  return `/app/cases/${encodeCaseId(caseId)}/agents/role/${encodeURIComponent(agentKey)}`;
}

export async function resolveAgentCaseHref(caseId: string, agentKey: string) {
  switch (agentKey) {
    case "query_parsing":
      return resolveQueryParsingHref(caseId);
    case "contract_risk_dispute_settlement":
      return resolveContractRiskHref(caseId);
    case "case_outcome_deadline_penalty":
      return resolveOutcomeHref(caseId);
    case "policy_compliance":
      return resolvePolicyComplianceHref(caseId);
    case "legal_drafts_validation":
      return resolveLegalDraftsHref(caseId);
    default:
      return resolveRoleAgentHref(caseId, agentKey);
  }
}

export async function openAgentCase(params: {
  agentKey: string;
  caseId: string;
  title?: string;
  setLocation: NavigateFn;
  replace?: boolean;
}) {
  const { agentKey, caseId, title, setLocation, replace = false } = params;
  const details = await safeFetchCase(caseId);
  const workspaceTitle = getCaseTitle(details, title);
  useAppStore.getState().setCaseWorkspace(caseId, workspaceTitle);
  await caseService.activateCase(caseId, workspaceTitle).catch(() => undefined);
  const href = await resolveAgentCaseHref(caseId, agentKey);
  setLocation(href, replace ? ({ replace: true } as any) : undefined);
  return href;
}

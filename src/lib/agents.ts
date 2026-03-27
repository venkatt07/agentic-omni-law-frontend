import {
  FileCheck,
  MessagesSquare,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  ScrollText,
} from "lucide-react";
import type { AppRole } from "@/store";
import { getRoleAgentsForRole } from "@/agents/roleAgentRegistry";

export interface AgentItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Search;
  comingSoon?: boolean;
}

export const commonAgents: AgentItem[] = [
  {
    id: "query",
    title: "Query Parsing",
    description: "Parse legal prompts into structured issues and relevant grounds.",
    href: "/app/agents/query",
    icon: Search,
  },
  {
    id: "contract",
    title: "Contract Risk + Dispute/Settlement",
    description: "Flag risky clauses and suggest dispute mitigation strategies.",
    href: "/app/agents/contract",
    icon: ShieldAlert,
  },
  {
    id: "outcome",
    title: "Case Outcome + Deadline/Penalty",
    description: "Project outcomes and track penalties and statutory deadlines.",
    href: "/app/agents/outcome",
    icon: Scale,
  },
  {
    id: "compliance",
    title: "Policy Compliance + Legal Risk Decision Support",
    description: "Evaluate policy fit and legal risk before decisions.",
    href: "/app/agents/compliance",
    icon: FileCheck,
  },
  {
    id: "draft",
    title: "Legal Draft Generator + Evidence/Validation",
    description: "Generate legal drafts and verify evidence/document quality.",
    href: "/app/agents/draft",
    icon: Sparkles,
  },
  {
    id: "terms",
    title: "Terms & Policies",
    description: "Recommend applicable policies, terms, and risk flags grounded in sources.",
    href: "/app/agents/terms",
    icon: ScrollText,
  },
];

export const outputItems: AgentItem[] = [
  {
    id: "summary",
    title: "Final Summary",
    description: "Final consolidated output from all legal modules.",
    href: "/app/agents/summary",
    icon: MessagesSquare,
  },
];

export const roleSpecificAgents = (role: AppRole): AgentItem[] => {
  if (!role) return [];
  return getRoleAgentsForRole(role).map((agent) => ({
    id: agent.agent_key,
    title: agent.title,
    description: agent.description,
    href: agent.route,
    icon: agent.icon,
  }));
};

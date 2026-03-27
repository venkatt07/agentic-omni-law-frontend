import { BookOpenCheck, BriefcaseBusiness, Building2, FileCheck, Gavel, MessageCircle, Route, Scale, UserRound, Wallet } from "lucide-react";
import type { AppRole } from "@/store";

export type RoleAgentKey =
  | "lawyer_strategy_action_plan"
  | "lawyer_client_communication"
  | "lawyer_court_process_copilot"
  | "lawyer_case_prep"
  | "lawyer_intern_guidance"
  | "student_workflow_case_mgmt"
  | "student_concept_learning_books"
  | "student_exam_preparation"
  | "corp_executive_decision_support"
  | "corp_workflow_case_prep"
  | "corp_court_process"
  | "individual_step_by_step_guidance"
  | "individual_family_explain"
  | "individual_cost_factor";

export type RoleAgentUI = {
  agent_key: RoleAgentKey;
  title: string;
  description: string;
  roles_visible: Array<Exclude<AppRole, null>>;
  icon: typeof Scale;
  route: string;
  preloader_steps: string[];
  supports_export_pdf: boolean;
  supports_export_docx: boolean;
};

const steps = [
  "Build case chronology",
  "Identify issues and goals",
  "Retrieve evidence snippets",
  "Generate structured output",
  "Validate and save",
];

export const roleAgentRegistry: Record<RoleAgentKey, RoleAgentUI> = {
  lawyer_strategy_action_plan: {
    agent_key: "lawyer_strategy_action_plan",
    title: "Strategy & Action Planning",
    description: "Litigation/ADR options with practical action plan.",
    roles_visible: ["Lawyer"],
    icon: Route,
    route: "/app/agents/role/lawyer_strategy_action_plan",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  lawyer_client_communication: {
    agent_key: "lawyer_client_communication",
    title: "Client Communication",
    description: "Client-facing explanation and message templates.",
    roles_visible: ["Lawyer"],
    icon: MessageCircle,
    route: "/app/agents/role/lawyer_client_communication",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  lawyer_court_process_copilot: {
    agent_key: "lawyer_court_process_copilot",
    title: "Court Process Co-pilot",
    description: "Procedural roadmap and filing checklist.",
    roles_visible: ["Lawyer"],
    icon: Gavel,
    route: "/app/agents/role/lawyer_court_process_copilot",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  lawyer_case_prep: {
    agent_key: "lawyer_case_prep",
    title: "Case Preparation",
    description: "Chronology, exhibits, witness and relief prep.",
    roles_visible: ["Lawyer"],
    icon: BriefcaseBusiness,
    route: "/app/agents/role/lawyer_case_prep",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  lawyer_intern_guidance: {
    agent_key: "lawyer_intern_guidance",
    title: "Intern Guidance",
    description: "Delegation plan and quality checklist.",
    roles_visible: ["Lawyer"],
    icon: UserRound,
    route: "/app/agents/role/lawyer_intern_guidance",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  student_workflow_case_mgmt: {
    agent_key: "student_workflow_case_mgmt",
    title: "Workflow & Case Management",
    description: "Case notebook and structured study workflow.",
    roles_visible: ["Law Student"],
    icon: BriefcaseBusiness,
    route: "/app/agents/role/student_workflow_case_mgmt",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  student_concept_learning_books: {
    agent_key: "student_concept_learning_books",
    title: "Concept Learning (Books)",
    description: "Concept maps and curated reading plan.",
    roles_visible: ["Law Student"],
    icon: BookOpenCheck,
    route: "/app/agents/role/student_concept_learning_books",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  student_exam_preparation: {
    agent_key: "student_exam_preparation",
    title: "Exam Preparation",
    description: "MCQs and exam-style issue spotting.",
    roles_visible: ["Law Student"],
    icon: FileCheck,
    route: "/app/agents/role/student_exam_preparation",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  corp_executive_decision_support: {
    agent_key: "corp_executive_decision_support",
    title: "Executive Decision Support",
    description: "C-level memo with options and impacts.",
    roles_visible: ["Business/Corporate"],
    icon: Building2,
    route: "/app/agents/role/corp_executive_decision_support",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  corp_workflow_case_prep: {
    agent_key: "corp_workflow_case_prep",
    title: "Workflow & Case Preparation",
    description: "Readiness checklist, approvals and owners.",
    roles_visible: ["Business/Corporate"],
    icon: BriefcaseBusiness,
    route: "/app/agents/role/corp_workflow_case_prep",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  corp_court_process: {
    agent_key: "corp_court_process",
    title: "Court Process Co-pilot",
    description: "Corporate litigation/arbitration path.",
    roles_visible: ["Business/Corporate"],
    icon: Gavel,
    route: "/app/agents/role/corp_court_process",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  individual_step_by_step_guidance: {
    agent_key: "individual_step_by_step_guidance",
    title: "Step-by-step Legal Guidance",
    description: "Plain-language next steps and templates.",
    roles_visible: ["Normal Person", "Individual"],
    icon: Route,
    route: "/app/agents/role/individual_step_by_step_guidance",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  individual_family_explain: {
    agent_key: "individual_family_explain",
    title: "Family Connect & Explain",
    description: "Case explanation for family communications.",
    roles_visible: ["Normal Person", "Individual"],
    icon: MessageCircle,
    route: "/app/agents/role/individual_family_explain",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
  individual_cost_factor: {
    agent_key: "individual_cost_factor",
    title: "Cost Factor",
    description: "Cost/time range planner with assumptions.",
    roles_visible: ["Normal Person", "Individual"],
    icon: Wallet,
    route: "/app/agents/role/individual_cost_factor",
    preloader_steps: steps,
    supports_export_pdf: true,
    supports_export_docx: false,
  },
};

export const roleAgentList = Object.values(roleAgentRegistry);

export function getRoleAgentsForRole(role: AppRole) {
  if (!role) return [];
  return roleAgentList.filter((item) => item.roles_visible.includes(role as Exclude<AppRole, null>));
}

export function getAllRoleAgents() {
  return roleAgentList;
}

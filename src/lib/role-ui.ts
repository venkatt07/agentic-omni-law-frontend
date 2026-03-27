import type { AppRole } from "@/store";
import { AlertTriangle, Briefcase, Clock, FileText } from "lucide-react";

export type RoleKey = Exclude<AppRole, null>;

export interface DashboardKpi {
  label: string;
  value: string;
  icon: typeof Briefcase;
  color: string;
  bg: string;
}

export interface QuickActionItem {
  title: string;
  href: string;
}

export interface RecommendedItem {
  title: string;
  desc: string;
  href: string;
}

export interface RoleUiConfig {
  showAnalytics: boolean;
  primaryCta: QuickActionItem;
  kpis: DashboardKpi[];
  quickActions: QuickActionItem[];
  recommended: RecommendedItem[];
  quickQueryHints: string[];
}

export const roleUiConfig: Record<RoleKey, RoleUiConfig> = {
  Lawyer: {
    showAnalytics: true,
    primaryCta: { title: "New Query Analysis", href: "/app/agents/query" },
    quickQueryHints: [
      "Professional intake: parties, agreement type, key dates, amount, breach, documents, relief.",
      "State chronology in one line: event, date, and consequence.",
      "List evidence: contract/PO, invoices, notices, emails, bank proof.",
      "Define what you want next: notice, settlement, recovery, filing.",
      "Use factual terms only; avoid analysis instructions.",
    ],
    kpis: [
      { label: "Active Cases", value: "12", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Upcoming Deadlines", value: "3", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
      { label: "Documents to Review", value: "48", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
      { label: "High Risk Contracts", value: "2", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    ],
    quickActions: [
      { title: "New Query Analysis", href: "/app/agents/query" },
      { title: "Open Case Workspace", href: "/app/cases" },
      { title: "Open Query Parsing", href: "/app/agents/query" },
    ],
    recommended: [
      { title: "Query Parsing", desc: "Extract legal grounds", href: "/app/agents/query" },
      { title: "Contract Risk", desc: "Flag dispute hotspots", href: "/app/agents/contract" },
      { title: "Court Process", desc: "Track hearings and filings", href: "/app/agents/role/lawyer_court_process_copilot" },
      { title: "Case Preparation", desc: "Prepare hearing artifacts", href: "/app/agents/role/lawyer_case_prep" },
    ],
  },
  "Law Student": {
    showAnalytics: false,
    primaryCta: { title: "Open Law Library", href: "/app/library" },
    quickQueryHints: [
      "Case note format: parties, facts, dates, documents, remedy sought.",
      "Summarize dispute in one sentence with a date anchor.",
      "Name the key document: contract, notice, invoice, order.",
      "List evidence available and any missing proof.",
      "Keep the input factual, not a request for analysis.",
    ],
    kpis: [
      { label: "Topics Studied", value: "27", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Notes Saved", value: "64", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
      { label: "Practice Tests", value: "12", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
      { label: "Book Progress", value: "78%", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    ],
    quickActions: [
      { title: "Open Law Library", href: "/app/library" },
      { title: "Start Learning Session", href: "/app/agents/role/student_concept_learning_books" },
      { title: "Generate Study Notes", href: "/app/agents/query" },
      { title: "Practice Exam", href: "/app/agents/role/student_exam_preparation" },
    ],
    recommended: [
      { title: "Law Library", desc: "Books + chapters", href: "/app/library" },
      { title: "Query Parsing", desc: "Break legal questions quickly", href: "/app/agents/query" },
      { title: "Concept Learning (Books)", desc: "Doctrine + references", href: "/app/agents/role/student_concept_learning_books" },
      { title: "Exam Prep", desc: "Generate prep material", href: "/app/agents/role/student_exam_preparation" },
    ],
  },
  "Business/Corporate": {
    showAnalytics: true,
    primaryCta: { title: "Review a Contract", href: "/app/agents/contract" },
    quickQueryHints: [
      "Professional intake: parties, contract scope, dates, amount, breach, documents, objective.",
      "Summarize the breach or performance issue with date and impact.",
      "List evidence: MSA/SOW/PO, invoices, acceptance, notices.",
      "State business objective: recovery, renegotiation, filing.",
      "Use factual inputs only; no analysis requests.",
    ],
    kpis: [
      { label: "Contracts Reviewed", value: "42", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Compliance Alerts", value: "6", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
      { label: "Renewals Due", value: "9", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
      { label: "Open Disputes", value: "3", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    ],
    quickActions: [
      { title: "Run Compliance Review", href: "/app/agents/compliance" },
      { title: "Contract Risk Scan", href: "/app/agents/contract" },
      { title: "Executive Summary", href: "/app/agents/summary" },
    ],
    recommended: [
      { title: "Contract Risk", desc: "Prioritize risky clauses", href: "/app/agents/contract" },
      { title: "Policy Compliance", desc: "Monitor obligations", href: "/app/agents/compliance" },
      { title: "Executive Decision Support", desc: "Leadership-ready legal decisions", href: "/app/agents/role/corp_executive_decision_support" },
    ],
  },
  "Normal Person": {
    showAnalytics: false,
    primaryCta: { title: "Start Guided Help", href: "/app/agents/role/individual_step_by_step_guidance" },
    quickQueryHints: [
      "Professional intake: parties, facts, dates, amount, documents, relief.",
      "Summarize the issue with one clear date and amount.",
      "List the proof you have: receipt, chat, invoice, notice.",
      "State the response from the other party.",
      "Keep it factual, not an analysis request.",
    ],
    kpis: [
      { label: "Open Issues", value: "3", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Next Steps", value: "2", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
      { label: "Estimated Cost Range", value: "Rs. 65,000 - Rs. 1,20,000", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
      { label: "Upcoming Dates", value: "1", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    ],
    quickActions: [
      { title: "Start Guided Help", href: "/app/agents/role/individual_step_by_step_guidance" },
      { title: "Estimate Cost", href: "/app/agents/role/individual_cost_factor" },
      { title: "Family Explain", href: "/app/agents/role/individual_family_explain" },
    ],
    recommended: [
      { title: "Step-by-step Guidance", desc: "Understand next actions", href: "/app/agents/role/individual_step_by_step_guidance" },
      { title: "Cost Factor", desc: "Plan legal expenses", href: "/app/agents/role/individual_cost_factor" },
      { title: "Family Connect & Explain", desc: "Explain the case to family", href: "/app/agents/role/individual_family_explain" },
      { title: "Query Parsing", desc: "Clarify your issue quickly", href: "/app/agents/query" },
    ],
  },
  Individual: {
    showAnalytics: false,
    primaryCta: { title: "Start Guided Help", href: "/app/agents/role/individual_step_by_step_guidance" },
    quickQueryHints: [
      "Professional intake: parties, facts, dates, amount, documents, relief.",
      "Summarize the issue with one clear date and amount.",
      "List the proof you have: receipt, chat, invoice, notice.",
      "State the response from the other party.",
      "Keep it factual, not an analysis request.",
    ],
    kpis: [
      { label: "Open Issues", value: "3", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Next Steps", value: "2", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
      { label: "Estimated Cost Range", value: "Rs. 65,000 - Rs. 1,20,000", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
      { label: "Upcoming Dates", value: "1", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    ],
    quickActions: [
      { title: "Start Guided Help", href: "/app/agents/role/individual_step_by_step_guidance" },
      { title: "Estimate Cost", href: "/app/agents/role/individual_cost_factor" },
      { title: "Family Explain", href: "/app/agents/role/individual_family_explain" },
    ],
    recommended: [
      { title: "Step-by-step Guidance", desc: "Understand next actions", href: "/app/agents/role/individual_step_by_step_guidance" },
      { title: "Cost Factor", desc: "Plan legal expenses", href: "/app/agents/role/individual_cost_factor" },
      { title: "Family Connect & Explain", desc: "Explain the case to family", href: "/app/agents/role/individual_family_explain" },
      { title: "Query Parsing", desc: "Clarify your issue quickly", href: "/app/agents/query" },
    ],
  },
};

export const resolveRole = (role: AppRole): RoleKey => role || "Lawyer";

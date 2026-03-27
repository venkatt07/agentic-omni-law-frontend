import type { AppRole } from "@/store";

export type LibraryRole = Exclude<AppRole, null>;

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  audience: LibraryRole[];
  level: "Foundation" | "Practice" | "Advanced";
  whyItMatters: string;
  chapters: string[];
  launchHref: string;
  launchLabel: string;
};

export const libraryCategories = [
  "Constitutional Law",
  "Civil Procedure",
  "Contract Law",
  "Corporate & Compliance",
  "Evidence",
  "Property & Family",
] as const;

export const libraryBooks: LibraryBook[] = [
  {
    id: "cpc-mulla",
    title: "Mulla on the Code of Civil Procedure",
    author: "Sir Dinshaw Fardunji Mulla",
    category: "Civil Procedure",
    audience: ["Law Student", "Lawyer"],
    level: "Advanced",
    whyItMatters: "Strong for injunctions, pleadings, jurisdiction, and procedural framing in civil litigation.",
    chapters: ["Jurisdiction", "Pleadings", "Temporary Injunctions", "Execution"],
    launchHref: "/app/agents/role/student_concept_learning_books",
    launchLabel: "Open Concept Learning",
  },
  {
    id: "sarkar-evidence",
    title: "Sarkar on Evidence",
    author: "Sarkar",
    category: "Evidence",
    audience: ["Law Student", "Lawyer"],
    level: "Advanced",
    whyItMatters: "Useful for admissibility, burden of proof, presumptions, and evidence strategy.",
    chapters: ["Admissions", "Confessions", "Burden of Proof", "Documentary Evidence"],
    launchHref: "/app/agents/role/student_exam_preparation",
    launchLabel: "Build Exam Notes",
  },
  {
    id: "pollock-mulla-contract",
    title: "Pollock & Mulla on the Indian Contract Act",
    author: "Pollock & Mulla",
    category: "Contract Law",
    audience: ["Law Student", "Lawyer", "Business/Corporate"],
    level: "Advanced",
    whyItMatters: "Deep reference for formation, breach, damages, indemnity, and guarantee analysis.",
    chapters: ["Offer and Acceptance", "Consideration", "Breach", "Damages"],
    launchHref: "/app/agents/contract",
    launchLabel: "Run Contract Risk",
  },
  {
    id: "mp-jain-constitution",
    title: "Indian Constitutional Law",
    author: "M.P. Jain",
    category: "Constitutional Law",
    audience: ["Law Student", "Lawyer", "Normal Person"],
    level: "Foundation",
    whyItMatters: "Core doctrinal grounding for rights analysis, state action, and constitutional remedies.",
    chapters: ["Fundamental Rights", "Judicial Review", "Directive Principles", "Writs"],
    launchHref: "/app/agents/query",
    launchLabel: "Ask a Legal Query",
  },
  {
    id: "avatar-singh-contract",
    title: "Law of Contract and Specific Relief",
    author: "Avtar Singh",
    category: "Contract Law",
    audience: ["Law Student", "Normal Person", "Business/Corporate"],
    level: "Foundation",
    whyItMatters: "Practical entry point for understanding breach, remedies, and enforceability.",
    chapters: ["Void Agreements", "Performance", "Breach of Contract", "Specific Relief"],
    launchHref: "/app/agents/query",
    launchLabel: "Start Query Parsing",
  },
  {
    id: "taxmann-compliance",
    title: "Corporate Law and Compliance Manual",
    author: "Taxmann Editorial",
    category: "Corporate & Compliance",
    audience: ["Business/Corporate", "Lawyer"],
    level: "Practice",
    whyItMatters: "Useful for recurring company-law and compliance operations across internal teams.",
    chapters: ["Board Governance", "Filings", "Secretarial Compliance", "Enforcement Exposure"],
    launchHref: "/app/agents/compliance",
    launchLabel: "Run Compliance Review",
  },
  {
    id: "raghav-property",
    title: "Property Law and Transfer Practice",
    author: "R.K. Sinha",
    category: "Property & Family",
    audience: ["Law Student", "Lawyer", "Normal Person"],
    level: "Practice",
    whyItMatters: "Supports land, title, inheritance, and family-property disputes with practical framing.",
    chapters: ["Transfer of Property", "Co-ownership", "Partition", "Inheritance"],
    launchHref: "/app/agents/role/individual_step_by_step_guidance",
    launchLabel: "Get Guided Help",
  },
  {
    id: "bare-acts-bundle",
    title: "Bare Acts Starter Shelf",
    author: "Official Text Collection",
    category: "Civil Procedure",
    audience: ["Law Student", "Lawyer", "Business/Corporate", "Normal Person"],
    level: "Foundation",
    whyItMatters: "Fastest way to anchor legal analysis in primary statutory text before commentary.",
    chapters: ["CPC", "Evidence Act", "Contract Act", "Specific Relief Act"],
    launchHref: "/app/agents/query",
    launchLabel: "Open Query Workspace",
  },
];

export function getLibraryBooksForRole(role: AppRole) {
  if (!role) return libraryBooks;
  return libraryBooks.filter((book) => book.audience.includes(role as LibraryRole));
}

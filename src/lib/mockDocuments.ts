export interface MockDocument {
  id: string;
  name: string;
  size: string;
  date: string;
  caseId: string | null;
  type: "uploaded" | "generated";
}

const STORAGE_KEY = "agentic_mock_documents";

const defaultDocuments: MockDocument[] = [
  {
    id: "d1",
    name: "Employment_Contract_Final.pdf",
    size: "2.4 MB",
    date: "Today",
    caseId: "CAS-2026-892",
    type: "generated",
  },
  {
    id: "d2",
    name: "Case_Notes_Q4.docx",
    size: "1.1 MB",
    date: "Yesterday",
    caseId: "CAS-2026-891",
    type: "uploaded",
  },
];

const isBrowser = typeof window !== "undefined";

export const readMockDocuments = (): MockDocument[] => {
  if (!isBrowser) return defaultDocuments;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDocuments));
    return defaultDocuments;
  }
  try {
    const parsed = JSON.parse(raw) as MockDocument[];
    if (!Array.isArray(parsed)) return defaultDocuments;
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDocuments));
    return defaultDocuments;
  }
};

export const writeMockDocuments = (docs: MockDocument[]) => {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
};

export const addMockDocument = (doc: Omit<MockDocument, "id" | "date">) => {
  const docs = readMockDocuments();
  const next: MockDocument = {
    ...doc,
    id: `doc-${Date.now()}`,
    date: "Just now",
  };
  const updated = [next, ...docs];
  writeMockDocuments(updated);
  return next;
};

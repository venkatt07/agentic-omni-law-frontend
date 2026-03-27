import { create } from "zustand";

export type AppRole =
  | "Lawyer"
  | "Law Student"
  | "Business/Corporate"
  | "Individual"
  | "Normal Person"
  | null;

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  role: AppRole;
  active_case_id?: string | null;
}

interface CaseWorkspace {
  caseId: string | null;
  title: string;
  uploadedDocuments: string[];
}

export interface CaseOutputs {
  query_parse?: {
    summary: string;
    executiveSummaryText?: string;
    mode?: "rag_llm" | "fallback" | string;
    domain: string;
    legalDomain?: string;
    caseType?: string | null;
    riskLabel: "Low" | "Medium" | "High";
    highlights: string[];
    issueGroups?: Array<{ title: string; description: string; priority: "high" | "medium" | "low" }>;
    legalGrounds?: string[];
    keyFacts?: Record<string, any>;
    evidenceAvailable?: string[];
    requestedOutcomes?: string[];
    detectedLanguage?: string;
    detectedLanguageCode?: string;
    detectedLanguageConfidence?: number;
    confidence?: number;
    confidenceScore?: number;
    jurisdictionGuess?: string;
    jurisdiction?: string | null;
    state?: string | null;
    citations?: Array<{ doc_id?: string; chunk_id?: string; snippet?: string; source_type?: string; source_label?: string }>;
    legalResearchAuthorities?: Array<{
      title: string;
      section?: string | null;
      authorityType?: "act" | "case_law" | "regulation" | "legal_opinion";
      relevance?: string;
      source?: "rag" | "llm";
      confidence?: number;
    }>;
    inputHash?: string;
    qaDebug?: any;
    provenance?: {
      case_id?: string;
      run_id?: string | null;
      input_hash?: string;
      doc_checksums_used?: string[];
      generated_at?: string;
      model_profile?: string;
    };
    filtersSupported?: {
      jurisdiction: boolean;
      legal_domain: boolean;
      date_range: boolean;
      source_types: string[];
    };
    filtersApplied?: {
      jurisdiction?: string;
      legal_domain?: string;
      date_range?: { from?: string; to?: string };
      source_types?: string[];
    };
  };
  terms_and_policies?: {
    summary: string;
    confidence?: number;
    applicable_policies?: Array<{ name: string; rationale: string }>;
    recommended_terms?: Array<{ title: string; clause_text: string }>;
    risk_flags?: Array<{ title: string; description: string }>;
    citations?: Array<{ doc_id?: string; chunk_id?: string; snippet?: string; source_type?: string; source_label?: string }>;
  };
  contract_risk?: {
    summary: string;
    score: number;
  };
  outcome?: {
    summary: string;
    probability: string;
  };
  compliance?: {
    summary: string;
    riskAreas: string[];
    confidence?: number;
    insufficient_sources?: boolean;
    citations?: Array<{ doc_id: string; chunk_id: string; snippet: string; source_type?: string; source_label?: string }>;
  };
  draft?: {
    summary: string;
    draftType: string;
  };
  final_summary?: {
    summary: string;
    generatedAt: string;
    byAgent?: Array<{
      agentKey: string;
      agentLabel: string;
      summary: string;
      citations: number;
      status: "ready" | "warning";
    }>;
  };
}

export interface CaseRecord {
  caseId: string;
  title: string;
  domain: string;
  status: "Active" | "Review" | "Drafting";
  lastUpdated: string;
  uploadedDocuments: string[];
  lastQuery?: string;
  outputs: CaseOutputs;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  authToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  selectedRole: AppRole;
  activeCaseId: string | null;
  casesById: Record<string, CaseRecord>;
  theme: "light" | "dark";
  largeText: boolean;
  language: string;
  caseWorkspace: CaseWorkspace;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setAuthToken: (token: string | null) => void;
  setSelectedRole: (role: AppRole) => void;
  setTheme: (theme: "light" | "dark") => void;
  setLargeText: (enabled: boolean) => void;
  setLanguage: (language: string) => void;
  startCaseWorkspace: (title?: string) => void;
  setCaseWorkspace: (caseId: string, title?: string) => void;
  setActiveCaseId: (caseId: string | null) => void;
  ensureActiveCase: (title?: string) => string;
  setCaseQuery: (caseId: string, query: string) => void;
  setCaseOutputs: (caseId: string, outputs: Partial<CaseOutputs>) => void;
  setWorkspaceDocuments: (caseId: string, names: string[]) => void;
  addWorkspaceDocument: (name: string) => void;
  clearWorkspace: () => void;
  hydrateFromStorage: () => void;
  logout: () => void;
}

const STORAGE_KEYS = {
  role: "agentic_role",
  user: "agentic_user",
  theme: "agentic_theme",
  largeText: "agentic_large_text",
  language: "agentic_language",
  caseWorkspace: "agentic_case_workspace",
  activeCaseId: "agentic_active_case_id",
  caseRecords: "agentic_case_records",
} as const;

const isBrowser = () => typeof window !== "undefined";

const applyUiPrefs = (theme: "light" | "dark", largeText: boolean) => {
  if (!isBrowser()) return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("large-text", largeText);
};

const nowIso = () => new Date().toISOString();
const normalizeDocumentNames = (names: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const normalized = String(raw || "").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
};

const nowLabel = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const buildCaseId = () => {
  const year = new Date().getFullYear();
  const serial = Math.floor(100 + Math.random() * 900);
  return `CAS-${year}-${serial}`;
};

const createCaseRecord = (caseId: string, title: string): CaseRecord => {
  const stamp = nowIso();
  return {
    caseId,
    title,
    domain: "General",
    status: "Active",
    lastUpdated: "Just now",
    uploadedDocuments: [],
    outputs: {},
    createdAt: stamp,
    updatedAt: stamp,
  };
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  authToken: null,
  isAuthenticated: false,
  selectedRole: null,
  activeCaseId: null,
  casesById: {},
  theme: "light",
  largeText: false,
  language: "English",
  caseWorkspace: {
    caseId: null,
    title: "Untitled Case Workspace",
    uploadedDocuments: [],
  },
  isHydrated: false,
  setUser: (user) => {
    if (isBrowser()) {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.role, user.role || "");
      } else {
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.role);
      }
    }
    set({
      user,
      selectedRole: user?.role || null,
      isAuthenticated: !!user,
    });
  },
  setAuthToken: (authToken) => {
    if (isBrowser()) {
      if (authToken) localStorage.setItem("agentic_auth_token", authToken);
      else localStorage.removeItem("agentic_auth_token");
    }
    set({ authToken, isAuthenticated: !!authToken && !!get().user });
  },
  setSelectedRole: (selectedRole) => {
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.role, selectedRole || "");
    }
    set((state) => {
      const updatedUser = state.user ? { ...state.user, role: selectedRole } : state.user;
      if (isBrowser() && updatedUser) {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
      }
      return {
        selectedRole,
        user: updatedUser,
      };
    });
  },
  setTheme: (theme) => {
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    }
    applyUiPrefs(theme, get().largeText);
    set({ theme });
  },
  setLargeText: (largeText) => {
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.largeText, String(largeText));
    }
    applyUiPrefs(get().theme, largeText);
    set({ largeText });
  },
  setLanguage: (language) => {
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.language, language);
    }
    set({ language });
  },
  startCaseWorkspace: (title = "Current Case Workspace") => {
    const caseId = buildCaseId();
    const workspace = { caseId, title, uploadedDocuments: [] as string[] };
    const currentCases = get().casesById;
    const existing = currentCases[caseId];
    const nextCase: CaseRecord = existing
      ? {
          ...existing,
          title,
          updatedAt: nowIso(),
          lastUpdated: nowLabel(),
        }
      : createCaseRecord(caseId, title);
    const nextCases = { ...currentCases, [caseId]: nextCase };
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.caseWorkspace, JSON.stringify(workspace));
      localStorage.setItem(STORAGE_KEYS.activeCaseId, caseId);
      localStorage.setItem(STORAGE_KEYS.caseRecords, JSON.stringify(nextCases));
    }
    set({ caseWorkspace: workspace, activeCaseId: caseId, casesById: nextCases });
  },
  setCaseWorkspace: (caseId, title = "Current Case Workspace") => {
    const current = get().caseWorkspace;
    const currentCases = get().casesById;
    const existing = currentCases[caseId];
    const normalizedProvidedTitle = (title || "").trim();
    const shouldUseProvidedTitle =
      !!normalizedProvidedTitle &&
      normalizedProvidedTitle !== "Current Case Workspace" &&
      normalizedProvidedTitle !== "Quick Query Workspace";
    const resolvedTitle = shouldUseProvidedTitle
      ? normalizedProvidedTitle
      : (existing?.title || normalizedProvidedTitle || "Current Case Workspace");
    const workspace = {
      caseId,
      title: resolvedTitle,
      uploadedDocuments:
        current.caseId === caseId
          ? current.uploadedDocuments
          : existing?.uploadedDocuments || [],
    };
    const nextCase: CaseRecord = existing
      ? {
          ...existing,
          title: workspace.title,
          uploadedDocuments: workspace.uploadedDocuments,
          updatedAt: nowIso(),
          lastUpdated: nowLabel(),
        }
      : createCaseRecord(caseId, workspace.title);
    const nextCases = { ...currentCases, [caseId]: nextCase };
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.caseWorkspace, JSON.stringify(workspace));
      localStorage.setItem(STORAGE_KEYS.activeCaseId, caseId);
      localStorage.setItem(STORAGE_KEYS.caseRecords, JSON.stringify(nextCases));
    }
    set({ caseWorkspace: workspace, activeCaseId: caseId, casesById: nextCases });
  },
  setActiveCaseId: (caseId) => {
    if (isBrowser()) {
      if (caseId) localStorage.setItem(STORAGE_KEYS.activeCaseId, caseId);
      else localStorage.removeItem(STORAGE_KEYS.activeCaseId);
    }
    set((state) => ({
      activeCaseId: caseId,
      user: state.user ? { ...state.user, active_case_id: caseId } : state.user,
    }));
  },
  ensureActiveCase: (title = "Current Case Workspace") => {
    const current = get();
    if (current.activeCaseId && current.casesById[current.activeCaseId]) {
      return current.activeCaseId;
    }
    const caseId = buildCaseId();
    const record = createCaseRecord(caseId, title);
    const workspace = {
      caseId,
      title: record.title,
      uploadedDocuments: record.uploadedDocuments,
    };
    const nextCases = { ...current.casesById, [caseId]: record };
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.caseWorkspace, JSON.stringify(workspace));
      localStorage.setItem(STORAGE_KEYS.activeCaseId, caseId);
      localStorage.setItem(STORAGE_KEYS.caseRecords, JSON.stringify(nextCases));
    }
    set({ activeCaseId: caseId, caseWorkspace: workspace, casesById: nextCases });
    return caseId;
  },
  setCaseQuery: (caseId, query) => {
    const current = get();
    const currentCase = current.casesById[caseId] || createCaseRecord(caseId, "Current Case Workspace");
    const updatedCase: CaseRecord = {
      ...currentCase,
      lastQuery: query,
      updatedAt: nowIso(),
      lastUpdated: nowLabel(),
    };
    const nextCases = { ...current.casesById, [caseId]: updatedCase };
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.caseRecords, JSON.stringify(nextCases));
    }
    set({ casesById: nextCases });
  },
  setCaseOutputs: (caseId, outputs) => {
    const current = get();
    const currentCase = current.casesById[caseId] || createCaseRecord(caseId, "Current Case Workspace");
    const updatedCase: CaseRecord = {
      ...currentCase,
      outputs: {
        ...currentCase.outputs,
        ...outputs,
      },
      updatedAt: nowIso(),
      lastUpdated: nowLabel(),
    };
    if (outputs.query_parse?.domain) {
      updatedCase.domain = outputs.query_parse.domain;
    }
    if (outputs.query_parse?.riskLabel === "High") {
      updatedCase.status = "Review";
    }
    const nextCases = { ...current.casesById, [caseId]: updatedCase };
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.caseRecords, JSON.stringify(nextCases));
    }
    set({ casesById: nextCases });
  },
  setWorkspaceDocuments: (caseId, names) => {
    const store = get();
    const normalizedNames = normalizeDocumentNames(names);
    const currentWorkspace = store.caseWorkspace;
    const existing = store.casesById[caseId] || createCaseRecord(caseId, currentWorkspace.title || "Current Case Workspace");
    const nextWorkspace =
      currentWorkspace.caseId === caseId
        ? {
            ...currentWorkspace,
            uploadedDocuments: normalizedNames,
          }
        : currentWorkspace;
    const nextCase: CaseRecord = {
      ...existing,
      uploadedDocuments: normalizedNames,
      updatedAt: nowIso(),
      lastUpdated: nowLabel(),
    };
    const nextCases = { ...store.casesById, [caseId]: nextCase };
    if (isBrowser()) {
      if (nextWorkspace.caseId === caseId) {
        localStorage.setItem(STORAGE_KEYS.caseWorkspace, JSON.stringify(nextWorkspace));
      }
      localStorage.setItem(STORAGE_KEYS.caseRecords, JSON.stringify(nextCases));
    }
    set({
      caseWorkspace: nextWorkspace,
      casesById: nextCases,
    });
  },
  addWorkspaceDocument: (name) => {
    const store = get();
    const current = store.caseWorkspace;
    const activeId = current.caseId || store.activeCaseId || buildCaseId();
    const nextDocuments = normalizeDocumentNames([...current.uploadedDocuments, name]);
    const updated = {
      ...current,
      caseId: activeId,
      title: current.title || "Current Case Workspace",
      uploadedDocuments: nextDocuments,
    };
    const existing = store.casesById[activeId] || createCaseRecord(activeId, updated.title);
    const nextCase: CaseRecord = {
      ...existing,
      title: updated.title,
      uploadedDocuments: updated.uploadedDocuments,
      updatedAt: nowIso(),
      lastUpdated: nowLabel(),
    };
    const nextCases = { ...store.casesById, [activeId]: nextCase };
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.caseWorkspace, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEYS.activeCaseId, activeId);
      localStorage.setItem(STORAGE_KEYS.caseRecords, JSON.stringify(nextCases));
    }
    set({ caseWorkspace: updated, activeCaseId: activeId, casesById: nextCases });
  },
  clearWorkspace: () => {
    const workspace = {
      caseId: null,
      title: "Untitled Case Workspace",
      uploadedDocuments: [],
    };
    if (isBrowser()) {
      localStorage.removeItem(STORAGE_KEYS.caseWorkspace);
      localStorage.removeItem(STORAGE_KEYS.activeCaseId);
    }
    set({ caseWorkspace: workspace, activeCaseId: null });
  },
  hydrateFromStorage: () => {
    if (!isBrowser()) return;
    const savedRole = localStorage.getItem(STORAGE_KEYS.role) as AppRole;
    const savedUser = localStorage.getItem(STORAGE_KEYS.user);
    const savedAuthToken = localStorage.getItem("agentic_auth_token");
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) as
      | "light"
      | "dark"
      | null;
    const savedLargeText = localStorage.getItem(STORAGE_KEYS.largeText);
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.language);
    const savedWorkspace = localStorage.getItem(STORAGE_KEYS.caseWorkspace);
    const savedActiveCaseId = localStorage.getItem(STORAGE_KEYS.activeCaseId);
    const savedCaseRecords = localStorage.getItem(STORAGE_KEYS.caseRecords);

    const user = savedUser ? (JSON.parse(savedUser) as User) : null;
    const theme = savedTheme === "dark" ? "dark" : "light";
    const largeText = savedLargeText === "true";

    applyUiPrefs(theme, largeText);

    const hydratedCases = savedCaseRecords
      ? (JSON.parse(savedCaseRecords) as Record<string, CaseRecord>)
      : {};

    set({
      user,
      authToken: savedAuthToken || null,
      isAuthenticated: !!savedAuthToken && !!user,
      selectedRole: savedRole || user?.role || null,
      activeCaseId: savedActiveCaseId || (savedWorkspace ? (JSON.parse(savedWorkspace) as CaseWorkspace).caseId : null),
      theme,
      largeText,
      language: savedLanguage || "English",
      casesById: hydratedCases,
      caseWorkspace: savedWorkspace
        ? (JSON.parse(savedWorkspace) as CaseWorkspace)
        : {
            caseId: null,
            title: "Untitled Case Workspace",
            uploadedDocuments: [],
          },
      isHydrated: true,
    });
  },
  logout: () => {
    if (isBrowser()) {
      localStorage.removeItem(STORAGE_KEYS.user);
      localStorage.removeItem("agentic_auth_token");
      localStorage.removeItem(STORAGE_KEYS.role);
      localStorage.removeItem(STORAGE_KEYS.caseWorkspace);
      localStorage.removeItem(STORAGE_KEYS.activeCaseId);
      localStorage.removeItem(STORAGE_KEYS.caseRecords);
    }
    set({
      user: null,
      authToken: null,
      isAuthenticated: false,
      selectedRole: null,
      activeCaseId: null,
      casesById: {},
      caseWorkspace: {
        caseId: null,
        title: "Untitled Case Workspace",
        uploadedDocuments: [],
      },
    });
  },
}));

import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import { useAppStore } from "@/store";

import Splash from "./pages/Splash";
import Landing from "./pages/Landing";
import RoleSelection from "./pages/RoleSelection";

import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import Verify from "./pages/auth/Verify";
import ForgotPassword from "./pages/auth/ForgotPassword";

import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Orchestrator from "./pages/app/Orchestrator";
import DashboardAnalysisLoading from "./pages/app/DashboardAnalysisLoading";
import CaseRunConsolePage from "./pages/app/CaseRunConsolePage";
import DashboardAnalysisResult from "./pages/app/DashboardAnalysisResult";
import Analytics from "./pages/app/Analytics";
import Support from "./pages/app/Support";
import Documents from "./pages/app/Documents";
import DocumentsMy from "./pages/app/DocumentsMy";
import DocumentsUpload from "./pages/app/DocumentsUpload";
import QueryParsing from "./pages/app/Agents/QueryParsing";
import QueryParsingLoading from "./pages/app/Agents/QueryParsingLoading";
import QueryParsingResult from "./pages/app/Agents/QueryParsingResult";
import ContractRisk from "./pages/app/Agents/ContractRisk";
import ContractRiskHome from "./pages/app/Agents/ContractRiskHome";
import ContractRiskAnalyzing from "./pages/app/Agents/ContractRiskAnalyzing";
import OutcomeProjection from "./pages/app/Agents/OutcomeProjection";
import CaseOutcomeForm from "./pages/app/Agents/CaseOutcomeForm";
import CaseOutcomeAnalyzing from "./pages/app/Agents/CaseOutcomeAnalyzing";
import CaseOutcomeResults from "./pages/app/Agents/CaseOutcomeResults";
import Compliance from "./pages/app/Agents/Compliance";
import LegalDraft from "./pages/app/Agents/LegalDraft";
import PolicyCompliance from "./pages/app/Agents/PolicyCompliance";
import PolicyComplianceHome from "./pages/app/Agents/PolicyComplianceHome";
import PolicyComplianceAnalyzing from "./pages/app/Agents/PolicyComplianceAnalyzing";
import LegalDraftGallery from "./pages/app/Agents/LegalDraftGallery";
import LegalDraftAnalyzing from "./pages/app/Agents/LegalDraftAnalyzing";
import LegalDraftEditor from "./pages/app/Agents/LegalDraftEditor";
import TermsPolicies from "./pages/app/Agents/TermsPolicies";
import Summaries from "./pages/app/Agents/Summaries";
import AgentsHub from "./pages/app/Agents/AgentsHub";
import RoleAgentPage from "./pages/app/Agents/RoleAgentPage";
import Settings from "./pages/app/Settings";
import Profile from "./pages/app/Profile";
import Notifications from "./pages/app/Notifications";
import Cases from "./pages/app/Cases";
import CaseWorkspace from "./pages/app/CaseWorkspace";
import SearchResults from "./pages/app/SearchResults";
import HowItWorks from "./pages/app/HowItWorks";
import Library from "./pages/app/Library";
import NavigationAudit from "./pages/dev/NavigationAudit";
import RouteTransitionFrame from "@/components/layout/RouteTransitionFrame";
import PageBackdropScene from "@/components/app/PageBackdropScene";
import { authService } from "@/services/authService";
import { analyticsService } from "@/services/analyticsService";
import { Loader2 } from "lucide-react";

function AppBootLoader() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <PageBackdropScene className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(24rem_16rem_at_50%_40%,rgba(59,130,246,0.08),transparent_68%),radial-gradient(18rem_14rem_at_50%_62%,rgba(168,85,247,0.08),transparent_72%)] dark:bg-[radial-gradient(24rem_16rem_at_50%_40%,rgba(59,130,246,0.1),transparent_68%),radial-gradient(18rem_14rem_at_50%_62%,rgba(168,85,247,0.1),transparent_72%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="flex max-w-[22rem] flex-col items-center text-center">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.4)]">
            <img
              src="/logo.png"
              alt="Agentic Omni Law logo"
              className="relative z-10 h-full w-full object-contain p-2"
            />
            <div className="absolute left-1/2 top-1/2 h-[4.9rem] w-[4.9rem] -translate-x-1/2 -translate-y-1/2">
              <Loader2 className="absolute right-[0.15rem] top-[0.15rem] h-4.5 w-4.5 animate-spin text-sky-500 dark:text-sky-300" />
            </div>
          </div>

          <div className="mt-6">
            <p className="font-heading text-[1.4rem] font-semibold tracking-[-0.05em] text-foreground">
              Agentic Omni Law
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Preparing your legal workspace
            </p>
          </div>

          <div className="mt-6 h-px w-28 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.75),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.65),transparent)]" />
        </div>
      </div>
    </div>
  );
}

function PublicOnlyAuthPage({ Component }: { Component: any }) {
  const [, setLocation] = useLocation();
  const authToken = useAppStore((state) => state.authToken);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isLoggedIn = Boolean(authToken && isAuthenticated);

  useEffect(() => {
    if (isLoggedIn) {
      setLocation("/app/dashboard", { replace: true } as any);
    }
  }, [isLoggedIn, setLocation]);

  if (isLoggedIn) return null;
  return <Component />;
}

function ProtectedAppShell() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const authToken = useAppStore((state) => state.authToken);
  const [, setLocation] = useLocation();

  if (!isAuthenticated || !authToken) {
    setLocation("/auth/signin", { replace: true } as any);
    return <AppBootLoader />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/app/dashboard" component={Dashboard} />
        <Route path="/app/orchestrator" component={Orchestrator} />
        <Route path="/app/dashboard/analysis/loading" component={DashboardAnalysisLoading} />
        <Route path="/app/cases/:caseId/run" component={CaseRunConsolePage} />
        <Route path="/app/dashboard/analysis/result" component={DashboardAnalysisResult} />
        <Route path="/app/how-it-works" component={HowItWorks} />
        <Route path="/app/analytics" component={Analytics} />
        <Route path="/app/cases/:caseId" component={CaseWorkspace} />
        <Route path="/app/cases" component={Cases} />
        <Route path="/app/search" component={SearchResults} />
        <Route path="/app/library" component={Library} />

        <Route path="/app/documents" component={Documents} />
        <Route path="/app/documents/my" component={DocumentsMy} />
        <Route path="/app/cases/:caseId/documents/:docId" component={DocumentsMy} />
        <Route path="/app/documents/upload" component={DocumentsUpload} />

        <Route path="/app/agents" component={AgentsHub} />
        <Route path="/app/agents/query" component={QueryParsing} />
        <Route path="/app/cases/:caseId/agents/query-parsing" component={QueryParsing} />
        <Route path="/app/agents/query/loading" component={QueryParsingLoading} />
        <Route path="/app/agents/query/result" component={QueryParsingResult} />
        <Route path="/app/cases/:caseId/agents/contract-risk" component={ContractRiskHome} />
        <Route path="/app/cases/:caseId/agents/contract-risk/analyzing" component={ContractRiskAnalyzing} />
        <Route path="/app/cases/:caseId/agents/contract-risk/results" component={ContractRisk} />
        <Route path="/app/agents/contract-risk" component={ContractRiskHome} />
        <Route path="/app/agents/contract" component={ContractRiskHome} />
        <Route path="/app/cases/:caseId/agents/case-outcome" component={CaseOutcomeForm} />
        <Route path="/app/cases/:caseId/agents/case-outcome/analyzing" component={CaseOutcomeAnalyzing} />
        <Route path="/app/cases/:caseId/agents/case-outcome/results" component={CaseOutcomeResults} />
        <Route path="/app/agents/case-outcome" component={OutcomeProjection} />
        <Route path="/app/agents/outcome" component={OutcomeProjection} />
        <Route path="/app/agents/compliance" component={Compliance} />
        <Route path="/app/cases/:caseId/agents/policy-compliance" component={PolicyComplianceHome} />
        <Route path="/app/cases/:caseId/agents/policy-compliance/analyzing" component={PolicyComplianceAnalyzing} />
        <Route path="/app/cases/:caseId/agents/policy-compliance/results" component={PolicyCompliance} />
        <Route path="/app/agents/draft" component={LegalDraft} />
        <Route path="/app/cases/:caseId/agents/legal-drafts" component={LegalDraftGallery} />
        <Route path="/app/cases/:caseId/agents/legal-drafts/:templateKey/analyzing" component={LegalDraftAnalyzing} />
        <Route path="/app/cases/:caseId/agents/legal-drafts/:templateKey/:draftId" component={LegalDraftEditor} />
        <Route path="/app/agents/terms" component={TermsPolicies} />
        <Route path="/app/agents/summary" component={Summaries} />
        <Route path="/app/agents/role/:agentKey" component={RoleAgentPage} />
        <Route path="/app/cases/:caseId/agents/role/:agentKey" component={RoleAgentPage} />

        <Route path="/app/support" component={Support} />
        <Route path="/app/settings" component={Settings} />
        <Route path="/app/profile" component={Profile} />
        <Route path="/app/notifications" component={Notifications} />

        <Route path="/app" component={Dashboard} />
        <Route component={Dashboard} />
      </Switch>
    </AppLayout>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/splash" component={Splash} />
      <Route path="/" component={Landing} />
      <Route path="/select-role" component={RoleSelection} />

      <Route path="/auth/signin" component={() => <PublicOnlyAuthPage Component={SignIn} />} />
      <Route path="/auth/signup" component={() => <PublicOnlyAuthPage Component={SignUp} />} />
      <Route path="/auth/verify" component={() => <PublicOnlyAuthPage Component={Verify} />} />
      <Route path="/auth/forgot" component={() => <PublicOnlyAuthPage Component={ForgotPassword} />} />
      <Route path="/dev/navigation-audit" component={NavigationAudit} />

      <Route path="/app/*" component={ProtectedAppShell} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location, setLocation] = useLocation();
  const hydrateFromStorage = useAppStore((state) => state.hydrateFromStorage);
  const setUser = useAppStore((state) => state.setUser);
  const setAuthToken = useAppStore((state) => state.setAuthToken);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const authToken = useAppStore((state) => state.authToken);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const [authRefreshing, setAuthRefreshing] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!authToken) {
      setAuthRefreshing(false);
      return;
    }
    let cancelled = false;
    setAuthRefreshing(true);
    authService
      .me()
      .then(({ user }) => {
        if (cancelled) return;
        setUser({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: (user as any).gender ?? null,
          dateOfBirth: (user as any).dateOfBirth ?? null,
          role: user.role,
          active_case_id: user.active_case_id || null,
        });
        if (typeof user.active_case_id === "string" && user.active_case_id) {
          setActiveCaseId(user.active_case_id);
        }
        if (user.preferredLanguage) {
          useAppStore.getState().setLanguage(user.preferredLanguage);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setAuthRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken, setActiveCaseId, setAuthToken, setUser]);

  useEffect(() => {
    if (location === "/" && !sessionStorage.getItem("splashed")) {
      sessionStorage.setItem("splashed", "true");
      setLocation("/splash");
    }
  }, [location, setLocation]);

  useEffect(() => {
    const isLoggedIn = Boolean(authToken && isAuthenticated);
    if (!isLoggedIn) return;
    const publicOnlyPaths = new Set(["/select-role", "/auth/signin", "/auth/signup", "/auth/verify"]);
    if (!publicOnlyPaths.has(location)) return;
    setLocation("/app/dashboard", { replace: true } as any);
  }, [authToken, isAuthenticated, location, setLocation]);

  useEffect(() => {
    void analyticsService.trackPageView(location, typeof document !== "undefined" ? document.title : location);
  }, [location]);

  if (!isHydrated) {
    return <AppBootLoader />;
  }

  if (authToken && authRefreshing) {
    return <AppBootLoader />;
  }

  const rootTransitionKey = location.startsWith("/app") ? "/app-shell" : location;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="relative min-h-screen">
          {!location.startsWith("/app") ? <PageBackdropScene className="absolute inset-0" /> : null}
          <div className="relative min-h-screen">
            <RouteTransitionFrame routeKey={rootTransitionKey} className="min-h-screen">
              <AppRouter />
            </RouteTransitionFrame>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

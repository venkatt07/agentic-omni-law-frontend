import { ReactNode, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { MessageCircle, Bot, Send, X, Loader2, Menu, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { useLocation } from "wouter";
import RouteTransitionFrame from "./RouteTransitionFrame";
import PageBackdropScene from "@/components/app/PageBackdropScene";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { chatService } from "@/services/chatService";
import { notificationService } from "@/services/notificationService";
import { caseService } from "@/services/caseService";
import { runService } from "@/services/runService";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import GlobalUiTranslator from "@/components/app/GlobalUiTranslator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AppLayout({ children }: { children: ReactNode }) {
  const CHAT_MEMORY_KEY = "aol_help_chat_v1";
  const SIDEBAR_EXPANDED_WIDTH = 256;
  const SIDEBAR_COLLAPSED_WIDTH = 64;
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const casesById = useAppStore((state) => state.casesById);
  const language = useAppStore((state) => state.language);
  const [location, setLocation] = useLocation();
  const { t } = useI18n();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantSending, setAssistantSending] = useState(false);
  const [leaveGuardOpen, setLeaveGuardOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"navigate" | "reload" | "back" | null>(null);
  const [roleRunGuardActive, setRoleRunGuardActive] = useState(false);
  const [roleRunMeta, setRoleRunMeta] = useState<{ runId?: string | null; caseId?: string | null; agentKey?: string | null }>({});
  const [assistantSuggestions, setAssistantSuggestions] = useState<string[]>([
    t("assistant.suggestionUpload"),
    t("assistant.suggestionExisting"),
  ]);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ id: string; role: "bot" | "user"; text: string }>>(() => {
    try {
      const raw = localStorage.getItem(CHAT_MEMORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed
            .filter((m) => m && (m.role === "bot" || m.role === "user") && typeof m.text === "string")
            .slice(-30);
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: "assistant-welcome",
        role: "bot",
        text: t("assistant.welcome"),
      },
    ];
  });
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const assistantInputRef = useRef<HTMLTextAreaElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const bypassNextPopGuardRef = useRef(false);

  const buildContextualAssistantSuggestions = () => {
    const currentCase = activeCaseId ? casesById[activeCaseId] : undefined;
    const route = location.split("?")[0] || location;
    const currentCaseTitle = String(currentCase?.title || "").trim();
    const items: string[] = [];
    if (route.includes("/agents/query")) items.push("Explain Query Parsing", "Open Query Parsing");
    else if (route.includes("/contract-risk")) items.push("Explain Contract Risk", "Open Contract Risk");
    else if (route.includes("/case-outcome")) items.push("Explain Outcome Prediction", "Open Outcome Prediction");
    else if (route.includes("/policy-compliance")) items.push("Explain Policy Compliance", "Open Policy Compliance");
    else if (route.includes("/legal-drafts")) items.push("Explain Legal Drafts", "Open Legal Drafts");
    else items.push("Open Query Parsing", "Explain latest report");
    if (currentCaseTitle) items.push(`Open ${currentCaseTitle}`, "Show case summary");
    else items.push(t("assistant.suggestionUpload"), t("assistant.suggestionExisting"));
    return items.filter((item, index, arr) => item && arr.indexOf(item) === index).slice(0, 4);
  };

  useEffect(() => {
    if (!assistantOpen) return;
    const node = chatScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [assistantMessages, assistantOpen]);

  useEffect(() => {
    if (!assistantOpen) return;
    const timer = window.setTimeout(() => {
      assistantInputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [assistantOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(assistantMessages.slice(-30)));
    } catch {
      // ignore
    }
  }, [assistantMessages]);

  useEffect(() => {
    setAssistantSuggestions((prev) => (
      prev.length <= 2 &&
      prev.every((item) => item === t("assistant.suggestionUpload") || item === t("assistant.suggestionExisting"))
        ? buildContextualAssistantSuggestions()
        : prev
    ));
    setAssistantMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.id !== "assistant-welcome") return prev;
      return [{ ...prev[0], text: t("assistant.welcome") }];
    });
  }, [activeCaseId, casesById, location, t]);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const refreshUnread = async () => {
      try {
        const data = await notificationService.unreadCount();
        if (!active) return;
        setUnreadNotifications(Math.max(0, Number(data?.unread_count || 0)));
      } catch {
        if (!active) return;
        setUnreadNotifications(0);
      }
    };

    void refreshUnread();
    timer = window.setInterval(() => {
      void refreshUnread();
    }, 15000);

    const onFocus = () => {
      void refreshUnread();
    };
    const onNotificationsUpdated = () => {
      void refreshUnread();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("notifications:updated", onNotificationsUpdated as EventListener);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notifications:updated", onNotificationsUpdated as EventListener);
    };
  }, [location]);

  useEffect(() => {
    if (!assistantOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAssistantOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [assistantOpen]);

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location]);

  const desktopSidebarOffset = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
  const pathname = location.split("?")[0] || location;
  const isImmersiveRoute =
    pathname === "/app/dashboard/analysis/loading" ||
    /\/app\/cases\/[^/]+\/run(?:\/|$)/.test(pathname) ||
    pathname === "/app/agents/query/loading" ||
    /\/app\/cases\/[^/]+\/agents\/(?:contract-risk|case-outcome|policy-compliance)\/analyzing(?:\/|$)/.test(pathname) ||
    /\/app\/cases\/[^/]+\/agents\/legal-drafts\/[^/]+\/analyzing(?:\/|$)/.test(pathname);
  const hasActiveProcessGuard = isImmersiveRoute || roleRunGuardActive;
  const leaveGuardMessage = "A live legal analysis is still running. Leaving this screen interrupts the live run view, and this step cannot be undone from here.";

  useEffect(() => {
    const onRoleRunGuard = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean; runId?: string | null; caseId?: string | null; agentKey?: string | null }>).detail;
      setRoleRunGuardActive(Boolean(detail?.active));
      setRoleRunMeta({
        runId: detail?.runId || null,
        caseId: detail?.caseId || null,
        agentKey: detail?.agentKey || null,
      });
    };
    window.addEventListener("role-agent-run-guard", onRoleRunGuard as EventListener);
    return () => window.removeEventListener("role-agent-run-guard", onRoleRunGuard as EventListener);
  }, []);

  const guardedNavigate = (href: string) => {
    if (!hasActiveProcessGuard || href === location) {
      setLocation(href);
      return;
    }
    setPendingHref(href);
    setPendingAction("navigate");
    setLeaveGuardOpen(true);
  };

  const bestEffortCancelActiveProcess = async () => {
    if (typeof window === "undefined") return;
    const current = new URL(window.location.href);
    const queryRunId = current.searchParams.get("runId") || "";
    const queryRunAllId = current.searchParams.get("runAllId") || "";
    const pathMatch = current.pathname.match(/\/app\/cases\/([^/]+)/);
    const pathCaseId = pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : "";
    const queryCaseId = current.searchParams.get("caseId") || "";
    const caseId = queryCaseId || pathCaseId || roleRunMeta.caseId || "";
    const runId = queryRunId || roleRunMeta.runId || "";

    try {
      if (caseId && queryRunAllId) {
        await caseService.cancelRunAll(caseId, queryRunAllId);
        return;
      }
    } catch {
      // best effort
    }

    try {
      if (runId) {
        await runService.stop(runId);
      }
    } catch {
      try {
        if (runId) await runService.cancel(runId);
      } catch {
        // best effort
      }
    }
  };

  const confirmGuardedNavigation = async () => {
    const href = pendingHref;
    setLeaveGuardOpen(false);
    setPendingHref(null);
    const action = pendingAction;
    setPendingAction(null);
    await bestEffortCancelActiveProcess();
    if (action === "reload") {
      window.location.reload();
      return;
    }
    if (action === "back") {
      bypassNextPopGuardRef.current = true;
      window.history.back();
      return;
    }
    if (href) setLocation(href);
  };

  const cancelGuardedNavigation = () => {
    setLeaveGuardOpen(false);
    setPendingHref(null);
    setPendingAction(null);
  };

  useEffect(() => {
    if (!hasActiveProcessGuard) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasActiveProcessGuard]);

  useEffect(() => {
    if (!hasActiveProcessGuard || typeof window === "undefined") return;
    const currentUrl = window.location.href;
    window.history.pushState({ runGuard: true }, "", currentUrl);
    const onPopState = () => {
      if (bypassNextPopGuardRef.current) {
        bypassNextPopGuardRef.current = false;
        return;
      }
      window.history.go(1);
      setPendingHref(null);
      setPendingAction("back");
      setLeaveGuardOpen(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasActiveProcessGuard]);

  useEffect(() => {
    if (!hasActiveProcessGuard || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = String(event.key || "").toLowerCase();
      const wantsReload =
        key === "f5" ||
        ((event.ctrlKey || event.metaKey) && key === "r");
      if (!wantsReload) return;
      event.preventDefault();
      setPendingHref(null);
      setPendingAction("reload");
      setLeaveGuardOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasActiveProcessGuard]);

  const sendAssistantValue = async (value: string, clearInputFirst: boolean) => {
    const recentMessages = assistantMessages
      .slice(-10)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text }));
    const nextRecentMessages = [...recentMessages, { role: "user", text: value }].slice(-10);
    const userMsg = { id: `u-${Date.now()}`, role: "user" as const, text: value };
    const botId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setAssistantMessages((prev) => [...prev, userMsg, { id: botId, role: "bot", text: "" }]);
    if (clearInputFirst) setAssistantInput("");
    setAssistantSending(true);
    try {
      const reply = await chatService.send({
        case_id: activeCaseId || undefined,
        message: value,
        language,
        mode: "support_fast",
        recent_messages: nextRecentMessages,
      });
      setAssistantMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text: reply.reply } : m)));
      if (Array.isArray(reply.suggestions) && reply.suggestions.length) {
        setAssistantSuggestions(reply.suggestions.map((s) => String(s)));
      }
    } catch {
      setAssistantMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? { ...m, text: t("assistant.error") }
            : m,
        ),
      );
    } finally {
      setAssistantSending(false);
      setAssistantInput("");
      requestAnimationFrame(() => assistantInputRef.current?.focus());
    }
  };

  const sendAssistantMessage = async () => {
    const value = assistantInput.trim();
    if (!value || assistantSending) return;
    await sendAssistantValue(value, true);
  };

  const sendSuggestedAssistantMessage = async (text: string) => {
    if (text === t("assistant.suggestionUpload")) {
      setLocation("/app/documents/upload");
      return;
    }
    if (text === t("assistant.suggestionExisting")) {
      setLocation("/app/cases");
      return;
    }
    setAssistantInput(text);
    const value = text.trim();
    if (!value || assistantSending) return;
    await sendAssistantValue(value, false);
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <GlobalUiTranslator />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        unreadNotifications={unreadNotifications}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onCloseMobile={() => setSidebarMobileOpen(false)}
        onNavigate={guardedNavigate}
      />

      <div
        className="relative flex min-w-0 flex-1 overflow-hidden transition-[padding-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:pl-[var(--sidebar-offset)]"
        style={{ ["--sidebar-offset" as string]: `${desktopSidebarOffset}px` }}
      >
        <main ref={mainScrollRef} className="app-scrollbar relative min-w-0 flex-1 overflow-y-auto bg-transparent pb-24 md:pb-8">
          {!isImmersiveRoute ? (
            <PageBackdropScene
              scrollContainerRef={mainScrollRef}
              className="fixed inset-y-0 right-0 hidden md:block"
              style={{ left: `${desktopSidebarOffset}px` }}
            />
          ) : null}
          {!isImmersiveRoute ? <PageBackdropScene scrollContainerRef={mainScrollRef} className="fixed inset-0 md:hidden" /> : null}

          <div className={cn("pointer-events-none fixed right-4 top-3 z-30 hidden justify-end md:flex xl:right-5", isImmersiveRoute && "hidden")}>
            <div className="app-float-chrome pointer-events-auto flex items-center gap-1 rounded-[1.05rem] px-1.5 py-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => guardedNavigate("/app/notifications")}
                className="relative h-8 w-8 rounded-lg border border-transparent bg-transparent hover:bg-white/55 dark:hover:bg-white/[0.08]"
                aria-label={t("nav.analytics")}
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" /> : null}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => guardedNavigate("/app/settings")}
                className="h-8 w-8 rounded-lg border border-transparent bg-transparent hover:bg-white/55 dark:hover:bg-white/[0.08]"
                aria-label={t("settings.title")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={cn("sticky top-0 z-20 flex justify-between px-4 pt-4 md:hidden", isImmersiveRoute && "hidden")}>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarMobileOpen(true)}
                className="h-11 w-11 rounded-2xl border border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))] shadow-[0_18px_38px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/8 dark:bg-[linear-gradient(135deg,rgba(10,18,34,0.9),rgba(8,12,24,0.74))]"
                aria-label={t("nav.expandSidebar")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="relative h-full">
            <RouteTransitionFrame routeKey={location} className="h-full">
              <div className={cn("min-h-full px-0 pb-8 pt-0 md:px-0 md:pt-0 xl:px-0", isImmersiveRoute && "px-0 pb-0 pt-0 md:px-0 md:pt-0 xl:px-0")}>
                <div className={cn("relative min-h-[calc(100vh-3rem)] md:min-h-[calc(100vh-3rem)]", isImmersiveRoute && "min-h-screen md:min-h-screen")}>
                  {!isImmersiveRoute ? (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(65%_50%_at_50%_0%,rgba(255,255,255,0.42),transparent_72%)] dark:bg-[radial-gradient(65%_50%_at_50%_0%,rgba(255,255,255,0.04),transparent_72%)]" />
                  ) : null}
                  <div className="relative z-10">{children}</div>
                </div>
              </div>
            </RouteTransitionFrame>
          </div>

          <div
            className={cn(
              `fixed bottom-24 right-4 z-30 h-[30rem] w-[min(92vw,24rem)] transition-all duration-300 ease-out md:bottom-6 md:right-6 ${
              assistantOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none translate-y-3 scale-[0.98] opacity-0"
            }`,
              isImmersiveRoute && "hidden"
            )}
            aria-hidden={!assistantOpen}
          >
            <Card className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,252,0.94))] shadow-[0_32px_90px_-52px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(8,14,28,0.95),rgba(10,18,34,0.98))]">
              <div className="relative flex items-center gap-3 border-b border-slate-200/75 px-4 py-3 dark:border-white/8">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(14,165,233,0.08))] text-sky-700 dark:bg-[linear-gradient(135deg,rgba(96,165,250,0.16),rgba(168,85,247,0.12))] dark:text-sky-200">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{t("assistant.title")}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{t("assistant.subtitle")}</p>
                </div>
                <div className="ml-auto mr-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-300" />
                  {t("common.live")}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8"
                  onClick={() => setAssistantOpen(false)}
                  aria-label={t("assistant.closeWindow")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div ref={chatScrollRef} className="app-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
                {assistantMessages.length <= 1 ? (
                  <div className="rounded-[1.15rem] border border-slate-200/70 bg-white/65 p-3 dark:border-white/8 dark:bg-white/[0.03]">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("assistant.suggestedQuestions")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assistantSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => void sendSuggestedAssistantMessage(suggestion)}
                          className="rounded-full border border-slate-200/80 bg-white/72 px-3 py-1.5 text-left text-xs transition-colors hover:border-sky-400/40 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-sky-400/30 dark:hover:bg-sky-400/10"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {assistantMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "rounded-br-md bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] text-white shadow-[0_18px_40px_-26px_rgba(37,99,235,0.62)]"
                          : "rounded-bl-md border border-slate-200/80 bg-white/82 text-slate-800 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/[0.05] dark:text-slate-100"
                      }`}
                    >
                      <span className="whitespace-pre-line break-words">{message.text}</span>
                    </div>
                  </div>
                ))}
                {assistantSending ? (
                  <div className="flex justify-start">
                    <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200/80 bg-white/82 px-3 py-2 text-sm text-slate-700 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-white/[0.05] dark:text-slate-200">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-300" />
                      Thinking...
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="border-t border-slate-200/75 p-3 dark:border-white/8">
                <div className="relative">
                  <Textarea
                    ref={assistantInputRef}
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendAssistantMessage();
                      }
                    }}
                    placeholder={t("assistant.placeholder")}
                    className="min-h-[76px] resize-none rounded-2xl border-slate-200/80 bg-white/86 pr-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-white/10 dark:bg-white/[0.04]"
                    aria-label="Message help and support chatbot"
                    disabled={assistantSending}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="absolute bottom-2 right-2 h-9 w-9 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] shadow-[0_18px_38px_-22px_rgba(37,99,235,0.62)]"
                    onClick={() => void sendAssistantMessage()}
                    disabled={assistantSending || !assistantInput.trim()}
                    aria-label="Send chatbot message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {!isImmersiveRoute ? (
            <button
              type="button"
              onClick={() => setAssistantOpen((open) => !open)}
              aria-label={assistantOpen ? t("assistant.close") : t("assistant.open")}
              className={`fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/25 bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] text-white shadow-[0_24px_52px_-20px_rgba(37,99,235,0.78)] transition-all duration-200 hover:scale-[1.03] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f4df1]/60 md:bottom-6 md:right-6 ${
                assistantOpen
                  ? "pointer-events-none scale-90 opacity-0"
                  : "pointer-events-auto scale-100 opacity-100"
              }`}
              title={t("assistant.title")}
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          ) : null}
        </main>
      </div>
      <AlertDialog open={leaveGuardOpen} onOpenChange={(open) => { if (!open) cancelGuardedNavigation(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave running analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              A live legal analysis is still running. If you leave now, the live progress screen will be interrupted and this step cannot be undone from here. Stay on this page until the report is ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelGuardedNavigation}>Stay Here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGuardedNavigation}>
              {pendingAction === "reload" ? "Reload Anyway" : pendingAction === "back" ? "Go Back Anyway" : "Leave Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

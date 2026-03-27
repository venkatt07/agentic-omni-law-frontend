import { useMemo } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Workflow,
  FileText,
  Upload,
  Search,
  BookOpen,
  ShieldAlert,
  Scale,
  FileCheck,
  PenTool,
  Briefcase,
  Sparkles,
  LineChart,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  Sidebar as SidebarIcon,
  PanelLeftClose,
  Plus,
} from "lucide-react";
import { useAppStore } from "@/store";
import { roleSpecificAgents } from "@/lib/agents";
import { resolveRole } from "@/lib/role-ui";
import { useI18n } from "@/hooks/useI18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  unreadNotifications: number;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigate: (href: string) => void;
};

export default function Sidebar({
  collapsed,
  mobileOpen,
  unreadNotifications,
  onToggleCollapse,
  onCloseMobile,
  onNavigate,
}: SidebarProps) {
  const expandedWidthClass = "md:w-64";
  const collapsedWidthClass = "md:w-[4.25rem]";
  const [location] = useLocation();
  const role = useAppStore((state) => state.selectedRole);
  const user = useAppStore((state) => state.user);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const logout = useAppStore((state) => state.logout);
  const activeRole = resolveRole(role);
  const { t } = useI18n();
  const extraAgents = roleSpecificAgents(activeRole);
  const userName = String(user?.name || "User").trim();
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
  const userNameClass =
    userName.length > 34
      ? "text-[11px] leading-4"
      : userName.length > 28
        ? "text-[12px] leading-4"
        : userName.length > 20
          ? "text-[13px] leading-4"
          : "text-[15px] leading-5";

  const primaryItems = useMemo(() => ([
    { title: t("nav.dashboard"), icon: LayoutDashboard, href: "/app/dashboard" },
    { title: "Orchestrator Console", icon: Workflow, href: "/app/orchestrator" },
    { title: t("nav.analytics"), icon: LineChart, href: "/app/analytics" },
    { title: t("nav.library"), icon: BookOpen, href: "/app/library" },
    { title: t("nav.cases"), icon: Briefcase, href: "/app/cases" },
    { title: t("nav.documents"), icon: FileText, href: "/app/documents/my" },
    { title: t("nav.upload"), icon: Upload, href: "/app/documents/upload" },
  ]), [t]);

  const agentItems = useMemo(() => ([
    { title: t("nav.queryParsing"), href: "/app/agents/query", icon: Search },
    { title: t("nav.contractRisk"), href: "/app/agents/contract", icon: ShieldAlert },
    { title: t("nav.outcomePrediction"), href: "/app/agents/outcome", icon: Scale },
    { title: t("nav.policyCompliance"), href: "/app/agents/compliance", icon: FileCheck },
    { title: t("nav.legalDrafts"), href: "/app/agents/draft", icon: PenTool },
    { title: t("nav.summaries"), href: "/app/agents/summary", icon: Sparkles },
  ]), [t]);

  const isActive = (path: string) => {
    if (path === "/app/cases") {
      return location === "/app/cases" || (location.startsWith("/app/cases/") && !location.includes("/agents/"));
    }
    if (path === "/app/agents/contract") {
      return location.startsWith("/app/agents/contract") || /\/app\/cases\/[^/]+\/agents\/contract-risk(?:\/|$)/.test(location);
    }
    if (path === "/app/agents/outcome") {
      return location.startsWith("/app/agents/outcome") || /\/app\/cases\/[^/]+\/agents\/case-outcome(?:\/|$)/.test(location);
    }
    if (path === "/app/agents/query") {
      return location.startsWith("/app/agents/query") || /\/app\/cases\/[^/]+\/agents\/query-parsing(?:\/|$)/.test(location);
    }
    if (path === "/app/agents/compliance") {
      return location.startsWith("/app/agents/compliance") || /\/app\/cases\/[^/]+\/agents\/policy-compliance(?:\/|$)/.test(location);
    }
    if (path === "/app/agents/draft") {
      return location.startsWith("/app/agents/draft") || /\/app\/cases\/[^/]+\/agents\/legal-drafts(?:\/|$)/.test(location);
    }
    if (path === "/app/agents/summary") return location.startsWith("/app/agents/summary");
    return location === path || location.startsWith(`${path}/`);
  };

  const navLink = (item: { title: string; href: string; icon: any }, compact = false) => (
    <button
      key={item.href}
      type="button"
      onClick={() => {
        onNavigate(item.href);
        onCloseMobile();
      }}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl text-left transition-all duration-200 ease-out",
        collapsed && !mobileOpen ? "justify-center px-0 py-0.5" : "px-3 py-2.5",
        isActive(item.href)
          ? (collapsed && !mobileOpen
            ? "bg-transparent text-foreground dark:bg-transparent"
            : "bg-white/42 text-foreground shadow-[0_10px_22px_-18px_rgba(15,23,42,0.1)] dark:bg-white/[0.05]")
          : (collapsed && !mobileOpen
            ? "text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
            : "text-muted-foreground hover:bg-white/24 hover:text-foreground dark:hover:bg-white/[0.04]")
      )}
      title={collapsed && !mobileOpen ? item.title : undefined}
    >
      {isActive(item.href) && !collapsed && !mobileOpen ? (
        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary/70" />
      ) : null}
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200",
        isActive(item.href) && "text-foreground dark:text-white"
      )}>
        <item.icon className={cn("h-5 w-5", compact && "h-4.5 w-4.5")} />
      </div>
      {!collapsed || mobileOpen ? (
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium tracking-[-0.01em]">{item.title}</div>
        </div>
      ) : null}
    </button>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/42 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r-0 bg-[linear-gradient(180deg,rgba(251,252,254,0.9),rgba(245,247,251,0.98))] backdrop-blur-xl transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-r-0 dark:bg-[linear-gradient(180deg,rgba(12,16,26,0.96),rgba(14,18,30,0.98))]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? collapsedWidthClass : expandedWidthClass,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(68%_22%_at_0%_0%,rgba(56,189,248,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_20%)] dark:bg-[radial-gradient(68%_22%_at_0%_0%,rgba(56,189,248,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_20%)]" />
        <div className={cn("relative flex h-[4.7rem] items-center gap-3 border-b border-black/6 px-3 dark:border-white/8", collapsed && !mobileOpen ? "justify-center" : "justify-between")}>
          {!collapsed || mobileOpen ? (
            <>
              <div className="min-w-0 flex-1 px-1">
                <div className="truncate text-[1rem] font-semibold tracking-[-0.02em] text-foreground">Agentic Omni</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onNavigate("/app/dashboard");
                    onCloseMobile();
                  }}
                  className="h-9 w-9 rounded-xl"
                  aria-label={t("nav.newQuery")}
                >
                  <Plus className="h-4.5 w-4.5" />
                </Button>
              </div>
            </>
          ) : null}
          <button
            type="button"
            onClick={mobileOpen ? onCloseMobile : onToggleCollapse}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          >
            {collapsed && !mobileOpen ? <SidebarIcon className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <div className="app-scrollbar relative flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {primaryItems.map((item) => navLink(item))}
          </div>
          {!collapsed || mobileOpen ? (
            <div className="px-3 pb-2 pt-5 text-[11px] font-medium tracking-[0.18em] text-muted-foreground">{t("nav.agents")}</div>
          ) : (
            <div className="my-4 h-px bg-black/6 dark:bg-white/8" />
          )}
          <div className="space-y-1">
            {agentItems.map((item) => navLink(item, true))}
            {extraAgents.map((agent) =>
              navLink({ title: agent.title, href: agent.href, icon: agent.icon }, true),
            )}
          </div>
        </div>

        <div className="relative border-t border-black/6 p-3 dark:border-white/8">
          <div className={cn("flex items-center gap-2", collapsed && !mobileOpen ? "flex-col" : "") }>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/24 dark:hover:bg-white/[0.04]",
                    collapsed && !mobileOpen ? "w-full justify-center px-0 py-0.5 hover:bg-transparent dark:hover:bg-transparent" : ""
                  )}
                  aria-label={t("nav.openProfileMenu")}
                  title={collapsed && !mobileOpen ? userName || t("nav.profile") : undefined}
                >
                  <div className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#111827,#334155)] text-[0.72rem] font-semibold tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_-18px_rgba(15,23,42,0.5)] dark:bg-[linear-gradient(135deg,#e2e8f0,#94a3b8)] dark:text-slate-950">
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_30%_25%,rgba(255,255,255,0.22),transparent_48%)] dark:bg-[radial-gradient(70%_70%_at_30%_25%,rgba(255,255,255,0.42),transparent_48%)]" />
                    <span className="relative">{userInitials}</span>
                  </div>
                  {!collapsed || mobileOpen ? (
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "font-semibold tracking-[-0.015em] text-foreground whitespace-normal break-words [overflow-wrap:anywhere]",
                          userNameClass,
                        )}
                      >
                        {userName}
                      </div>
                      <div className="mt-0.5 text-[0.84rem] leading-5 text-muted-foreground">{user?.role || "Role"}</div>
                    </div>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56 rounded-2xl">
                <DropdownMenuItem onSelect={() => onNavigate("/app/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    logout();
                    onNavigate("/auth/signin");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "h-10 w-10 shrink-0 rounded-xl border border-black/6 bg-white/78 text-muted-foreground hover:bg-white hover:text-foreground dark:border-white/8 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:hover:text-white",
                collapsed && !mobileOpen ? "border-transparent bg-transparent shadow-none hover:bg-black/[0.04] dark:hover:bg-white/[0.05]" : ""
              )}
              aria-label={theme === "dark" ? t("common.themeToLight") : t("common.themeToDark")}
              title={theme === "dark" ? t("common.lightTheme") : t("common.darkTheme")}
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

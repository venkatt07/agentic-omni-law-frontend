import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Briefcase,
  FileText,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { resolveRole, roleUiConfig } from "@/lib/role-ui";
import { useI18n } from "@/hooks/useI18n";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const role = useAppStore((state) => state.selectedRole);
  const activeRole = resolveRole(role);
  const showAnalytics = roleUiConfig[activeRole].showAnalytics;
  const { t } = useI18n();

  const navItems = [
    { title: t("nav.dashboard"), href: "/app/dashboard", icon: LayoutDashboard },
    ...(showAnalytics ? [{ title: t("nav.analytics"), href: "/app/analytics", icon: BarChart3 }] : []),
    { title: t("nav.cases"), href: "/app/cases", icon: Briefcase },
    { title: t("nav.documents"), href: "/app/documents/my", icon: FileText },
    { title: t("nav.agents"), href: "/app/agents", icon: Search },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/45 bg-white/74 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58 dark:border-white/8 dark:bg-slate-950/74 md:hidden">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent dark:via-sky-400/25" />
      <div className={`grid h-[4.5rem] ${showAnalytics ? "grid-cols-5" : "grid-cols-4"}`}>
        {navItems.map((item) => {
          const active = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "h-full w-full flex flex-col items-center justify-center gap-1.5 text-[11px] font-medium transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
                aria-label={`Open ${item.title}`}
              >
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl border border-transparent transition-all duration-200",
                  active
                    ? "border-primary/18 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(14,165,233,0.08))] shadow-[0_16px_32px_-22px_rgba(37,99,235,0.48)] dark:border-sky-400/18 dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(8,47,73,0.26))]"
                    : "bg-transparent"
                )}>
                  <item.icon className={cn("h-4 w-4", active && "text-primary dark:text-sky-300")} />
                </div>
                <span>{item.title}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

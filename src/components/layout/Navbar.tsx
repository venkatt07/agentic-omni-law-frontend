import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { ChevronDown } from "lucide-react";

export default function Navbar() {
  const authToken = useAppStore((state) => state.authToken);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isLoggedIn = Boolean(authToken && isAuthenticated);
  return (
    <header className="sticky top-0 z-50 w-full px-4 pt-4 md:px-6 xl:px-8">
      <div className="mx-auto flex h-[4.35rem] max-w-[92rem] items-center justify-between rounded-[1.6rem] px-4 app-float-chrome md:px-5">
        <Link href="/">
          <div className="flex cursor-pointer items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-1.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.4)]">
              <img
                src="/logo.png"
                alt="Agentic Omni Law logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="hidden md:flex md:items-center md:gap-1.5">
              <div>
                <div className="font-heading text-[1.02rem] font-semibold tracking-tight">Agentic Omni</div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Legal Intelligence Platform</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-2 rounded-full border border-black/5 bg-white/35 px-2 py-1 dark:border-white/6 dark:bg-white/[0.025]">
          {[
            ["Home", "#home"],
            ["Features", "#features"],
            ["About", "#about"],
            ["Contact", "#contact"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/70 hover:text-[#0d47c4] dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-sky-300"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href={isLoggedIn ? "/app/dashboard" : "/auth/signin"}>
            <Button variant="ghost" className="hidden rounded-xl text-slate-700 hover:text-[#0d47c4] dark:text-slate-200 sm:flex">
              Sign In
            </Button>
          </Link>
          <Link href="/select-role">
            <Button className="h-10 rounded-full bg-[linear-gradient(135deg,#0f47cf,#2563eb_50%,#06b6d4)] px-5 text-white shadow-[0_20px_34px_-18px_rgba(37,99,235,0.48)] hover:brightness-105">
              Open Workspace
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

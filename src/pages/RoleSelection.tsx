import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Briefcase, GraduationCap, Building2, User } from "lucide-react";
import { useAppStore, type AppRole } from "@/store";
import BackButton from "@/components/app/BackButton";
import { cn } from "@/lib/utils";

const roles: { id: Exclude<AppRole, null>; title: string; description: string; icon: typeof Briefcase; color: string }[] = [
  {
    id: "Lawyer",
    title: "Lawyer / Advocate",
    description: "Advanced tools for case strategy, precedent research, and automated drafting.",
    icon: Briefcase,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:border-blue-500",
  },
  {
    id: "Law Student",
    title: "Law Student",
    description: "Learn concepts, manage coursework, and simulate real-world case workflows.",
    icon: GraduationCap,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:border-emerald-500",
  },
  {
    id: "Business/Corporate",
    title: "Business / Corporate",
    description: "Contract risk analysis, compliance monitoring, and executive decision support.",
    icon: Building2,
    color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:border-indigo-500",
  },
  {
    id: "Normal Person",
    title: "Normal Person",
    description: "Step-by-step guidance, plain-english explanations, and cost estimations.",
    icon: User,
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:border-orange-500",
  },
];

export default function RoleSelection() {
  const setSelectedRole = useAppStore((state) => state.setSelectedRole);
  const [, setLocation] = useLocation();

  const handleRoleSelect = (roleId: Exclude<AppRole, null>) => {
    setSelectedRole(roleId);
    setLocation("/auth/signup", { replace: true } as any);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start md:justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="mb-6">
          <BackButton fallbackHref="/" />
        </div>

        <div className="text-center mb-8 md:mb-12">
          <Link href="/">
            <div className="inline-flex items-center gap-2 mb-6 cursor-pointer">
              <div className="h-8 w-8 rounded-md border border-slate-200 bg-white p-1.5">
                <img
                  src="/logo.png"
                  alt="Agentic Omni Law logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight">AGENTIC OMNI LAW</span>
            </div>
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold font-heading mb-4">How do you want to use the platform?</h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Select your primary role. This customizes your dashboard, available AI agents, and workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 auto-rows-fr">
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="h-full"
            >
              <button
                type="button"
                onClick={() => handleRoleSelect(role.id)}
                className={cn(
                  "w-full h-full min-h-[190px] md:min-h-[220px] rounded-xl border-2 p-6 text-left transition-all duration-300 bg-card/50 backdrop-blur-sm shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  role.color,
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-4 rounded-xl", role.color.split(" ")[0], role.color.split(" ")[1])}>
                    <role.icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-foreground">{role.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{role.description}</p>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 md:mt-12 text-center">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin">
              <span className="text-primary font-medium hover:underline cursor-pointer">Sign In</span>
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

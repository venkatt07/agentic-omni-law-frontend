import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppStore } from "@/store";
import BackButton from "@/components/app/BackButton";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";

const signInSchema = z.object({
  email: z.string().min(3, "Enter email or phone"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignIn() {
  const [, setLocation] = useLocation();
  const setUser = useAppStore((state) => state.setUser);
  const setAuthToken = useAppStore((state) => state.setAuthToken);
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    setSubmitting(true);
    try {
      const result = await authService.login(data.email, data.password);
      setAuthToken(result.token);
      setUser({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        gender: result.user.gender ?? null,
        dateOfBirth: result.user.dateOfBirth ?? null,
        role: result.user.role,
        active_case_id: result.user.active_case_id || null,
      });
      if (result.user.preferredLanguage) {
        useAppStore.getState().setLanguage(result.user.preferredLanguage);
      }
      setLocation("/app/dashboard", { replace: true } as any);
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Unable to sign in.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(135deg,#eef4ff_0%,#f8f9fc_42%,#edf7ff_100%)] px-4 py-4 dark:bg-[linear-gradient(135deg,#091426_0%,#0d162b_46%,#101b33_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center">
        <div className="w-full">
          <div className="mb-3">
            <BackButton fallbackHref="/" disableHistory />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Card className="relative hidden overflow-hidden border-white/50 bg-[linear-gradient(180deg,rgba(8,32,79,0.96),rgba(13,71,196,0.92)_52%,rgba(37,99,235,0.9))] p-7 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.55)] lg:flex lg:min-h-[38rem] lg:flex-col lg:justify-between">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(54%_46%_at_0%_0%,rgba(255,255,255,0.18),transparent_38%),radial-gradient(40%_32%_at_100%_0%,rgba(34,211,238,0.16),transparent_34%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/84">
                  Account access
                </div>
                <h1 className="mt-5 max-w-[10ch] text-[3rem] font-semibold font-heading leading-[0.94] tracking-[-0.06em]">
                  Return to your workspace.
                </h1>
                <p className="mt-4 max-w-[34rem] text-sm leading-8 text-white/74">
                  Sign in to continue with your active case, saved documents, and previous agent work.
                </p>
              </div>

              <div className="relative grid gap-3">
                {[
                  { icon: ShieldCheck, title: "Case continuity", text: "Your active workspace and previous case activity remain connected after sign-in." },
                  { icon: LockKeyhole, title: "Secure access", text: "Credentials and verification protect entry into your workspace." },
                  { icon: CheckCircle2, title: "Single system", text: "Dashboard, documents, agents, and case history all sit behind the same account." },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.2rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white">
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{item.title}</div>
                        <div className="mt-1 text-sm leading-6 text-white/70">{item.text}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="w-full rounded-[1.7rem] border-black/6 bg-white/90 p-5 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(9,14,24,0.88)] sm:p-6">
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
                  Sign in
                </div>
                <h2 className="mt-4 text-[2rem] font-semibold font-heading tracking-[-0.05em] text-foreground">Welcome back</h2>
                <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to continue.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email or Phone</Label>
                  <Input id="email" placeholder="name@example.com" disabled={submitting} className="h-11 rounded-xl" {...register("email")} />
                  {errors.email && <p className="text-destructive text-xs">{errors.email.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/auth/forgot">
                      <span className="text-xs text-primary cursor-pointer hover:underline">
                      Forgot password?
                      </span>
                    </Link>
                  </div>
                  <Input id="password" type="password" disabled={submitting} className="h-11 rounded-xl" {...register("password")} />
                  {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
                </div>

                <div className="rounded-[1rem] border border-border/70 bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
                  After sign-in, you will return directly to the main workspace.
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#0f47cf,#2563eb_55%,#1d4ed8)] text-white shadow-[0_20px_34px_-22px_rgba(37,99,235,0.55)] hover:brightness-105"
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-5 flex items-center justify-center border-t border-border/70 pt-4">
                <span className="text-sm text-muted-foreground">
                  Don&apos;t have an account? <Link href="/select-role"><span className="text-primary font-medium hover:underline cursor-pointer">Sign up</span></Link>
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

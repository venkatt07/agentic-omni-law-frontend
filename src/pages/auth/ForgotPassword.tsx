import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import BackButton from "@/components/app/BackButton";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const resetSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  code: z.string().length(6, "Enter the 6-digit code"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .refine((value) => /[A-Z]/.test(value), "Include at least one uppercase letter")
    .refine((value) => /[a-z]/.test(value), "Include at least one lowercase letter")
    .refine((value) => /\d/.test(value), "Include at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RequestForm = z.infer<typeof requestSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [submitting, setSubmitting] = useState(false);
  const [lockedEmail, setLockedEmail] = useState("");

  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "", code: "", newPassword: "", confirmPassword: "" },
  });

  const handleRequest = async (data: RequestForm) => {
    setSubmitting(true);
    try {
      await authService.requestPasswordReset(data.email.trim().toLowerCase());
      setLockedEmail(data.email.trim().toLowerCase());
      resetForm.setValue("email", data.email.trim().toLowerCase(), { shouldValidate: true });
      setStep("reset");
      toast({
        title: "OTP sent",
        description: "Check your email for the 6-digit verification code.",
      });
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Unable to send OTP.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (data: ResetForm) => {
    setSubmitting(true);
    try {
      await authService.resetPassword({
        email: data.email.trim().toLowerCase(),
        code: data.code.trim(),
        newPassword: data.newPassword,
      });
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      setLocation("/auth/signin", { replace: true } as any);
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unable to reset password.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(70%_60%_at_15%_0%,rgba(59,130,246,0.12),transparent_60%),radial-gradient(60%_50%_at_100%_10%,rgba(14,116,144,0.08),transparent_58%),linear-gradient(180deg,#f2f5ff_0%,#f7f8fc_55%,#edf6ff_100%)] px-4 py-8 dark:bg-[radial-gradient(70%_60%_at_15%_0%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(60%_50%_at_100%_10%,rgba(14,116,144,0.12),transparent_58%),linear-gradient(180deg,#0a1222_0%,#0d1628_55%,#0f1b33_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <div className="w-full">
          <div className="mb-4">
            <BackButton fallbackHref="/auth/signin" />
          </div>

          <Card className="w-full rounded-[1.5rem] border-black/6 bg-white/95 p-6 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(10,14,26,0.92)] sm:p-7">
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
                <Mail className="h-3.5 w-3.5" />
                Password reset
              </div>
              <h2 className="mt-4 text-[1.9rem] font-semibold font-heading tracking-[-0.05em] text-foreground">
                Reset your password
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {step === "request"
                  ? "Enter your account email to receive a 6-digit verification code."
                  : "Enter the code from your email and choose a new password."}
              </p>
            </div>

            {step === "request" ? (
              <form onSubmit={requestForm.handleSubmit(handleRequest)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@domain.com"
                    autoComplete="email"
                    disabled={submitting}
                    className="h-11 rounded-xl"
                    {...requestForm.register("email")}
                  />
                  {requestForm.formState.errors.email && (
                    <p className="text-destructive text-xs">{requestForm.formState.errors.email.message as string}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#0f47cf,#2563eb_55%,#1d4ed8)] text-white shadow-[0_20px_34px_-22px_rgba(37,99,235,0.55)] hover:brightness-105"
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    disabled
                    className="h-11 rounded-xl"
                    value={lockedEmail}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="code">OTP Code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    disabled={submitting}
                    className="h-11 rounded-xl tracking-[0.3em]"
                    {...resetForm.register("code")}
                  />
                  {resetForm.formState.errors.code && (
                    <p className="text-destructive text-xs">{resetForm.formState.errors.code.message as string}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 chars, 1 number, 1 uppercase"
                    autoComplete="new-password"
                    disabled={submitting}
                    className="h-11 rounded-xl"
                    {...resetForm.register("newPassword")}
                  />
                  {resetForm.formState.errors.newPassword && (
                    <p className="text-destructive text-xs">{resetForm.formState.errors.newPassword.message as string}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password exactly"
                    autoComplete="new-password"
                    disabled={submitting}
                    className="h-11 rounded-xl"
                    {...resetForm.register("confirmPassword")}
                  />
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-destructive text-xs">{resetForm.formState.errors.confirmPassword.message as string}</p>
                  )}
                </div>

                <div className="rounded-[1rem] border border-border/70 bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
                  Use the latest OTP sent to your email. Codes expire after a few minutes.
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#0f47cf,#2563eb_55%,#1d4ed8)] text-white shadow-[0_20px_34px_-22px_rgba(37,99,235,0.55)] hover:brightness-105"
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}

            <div className="mt-5 flex items-center justify-center border-t border-border/70 pt-4">
              <span className="text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link href="/auth/signin">
                  <span className="text-primary font-medium hover:underline cursor-pointer">Sign in</span>
                </Link>
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

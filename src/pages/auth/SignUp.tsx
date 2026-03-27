import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppStore } from "@/store";
import BackButton from "@/components/app/BackButton";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

const normalizeDigitsOnly = (value: string) => value.replace(/\D/g, "");
const normalizeIndianPhone = (value: string) => normalizeDigitsOnly(value).slice(0, 10);
const toIndianE164 = (value: string) => `+91${normalizeIndianPhone(value)}`;

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Enter your full name")
    .max(80, "Name is too long")
    .refine((value) => /^[A-Za-z][A-Za-z\s'.-]*$/.test(value), "Use letters only for the name"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(120, "Email is too long"),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianPhone)
    .refine((value) => /^\d{10}$/.test(value), "Enter a valid 10-digit phone number"),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true;
      const selected = new Date(value);
      if (Number.isNaN(selected.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected <= today;
    }, "Date of birth cannot be in the future"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .refine((value) => /[A-Z]/.test(value), "Include at least one uppercase letter")
    .refine((value) => /[a-z]/.test(value), "Include at least one lowercase letter")
    .refine((value) => /\d/.test(value), "Include at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const [, setLocation] = useLocation();
  const role = useAppStore(state => state.selectedRole);
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (data: SignUpForm) => {
    setSubmitting(true);
    try {
      await authService.signup({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: toIndianE164(data.phone),
        gender: data.gender ? data.gender : undefined,
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth : undefined,
        password: data.password,
        role: (role || "Lawyer") as any,
      });
      sessionStorage.setItem("pending_verify_email", data.email.trim().toLowerCase());
      sessionStorage.setItem("pending_verify_phone", toIndianE164(data.phone));
      setLocation("/auth/verify", { replace: true } as any);
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Unable to sign up.",
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
          <BackButton fallbackHref="/select-role" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Card className="relative hidden overflow-hidden border-white/50 bg-[linear-gradient(180deg,rgba(8,32,79,0.96),rgba(13,71,196,0.92)_52%,rgba(37,99,235,0.9))] p-7 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.55)] lg:flex lg:min-h-[38rem] lg:flex-col lg:justify-between">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(54%_46%_at_0%_0%,rgba(255,255,255,0.18),transparent_38%),radial-gradient(40%_32%_at_100%_0%,rgba(34,211,238,0.16),transparent_34%)]" />
              <div className="relative">
                
                <h1 className="mt-5 max-w-[11ch] text-[3rem] font-semibold font-heading leading-[0.94] tracking-[-0.06em]">
                  Create your workspace account.
                </h1>
                <p className="mt-4 max-w-[34rem] text-sm leading-8 text-white/74">
                  Set up one account for your case workspace, documents, and role-based workflows.
                </p>
              </div>

              <div className="relative grid gap-3">
                {[
                  { icon: ShieldCheck, title: "Verified workspace", text: "Email and phone verification keep case access tied to one controlled identity." },
                  { icon: LockKeyhole, title: "Secure by default", text: "Your role, active case, and workspace context stay connected after sign-in." },
                  { icon: CheckCircle2, title: "Built for actual use", text: "Lawyer, law student, business, and normal person flows are all supported from the same product." },
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
               
                <h2 className="mt-4 text-[2rem] font-semibold font-heading tracking-[-0.05em] text-foreground">Create Account</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {role ? `Signing up as ${role}` : "Register to get started"}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Mathew"
                      autoComplete="name"
                      disabled={submitting}
                      className="h-11 rounded-xl"
                      {...register("name")}
                    />
                    {errors.name && <p className="text-destructive text-xs">{errors.name.message as string}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@domain.com"
                      autoComplete="email"
                      disabled={submitting}
                      className="h-11 rounded-xl"
                      {...register("email")}
                    />
                    {errors.email && <p className="text-destructive text-xs">{errors.email.message as string}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex h-11 overflow-hidden rounded-xl border border-input bg-background shadow-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
                      <div className="flex items-center border-r border-border/80 bg-muted/35 px-3 text-sm font-medium text-foreground">
                        +91
                      </div>
                      <Controller
                        control={control}
                        name="phone"
                        render={({ field }) => (
                          <input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={10}
                            autoComplete="tel-national"
                            placeholder="9876543210"
                            disabled={submitting}
                            className="h-full w-full border-0 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                            value={field.value || ""}
                            onChange={(event) => field.onChange(normalizeIndianPhone(event.target.value))}
                            onPaste={(event) => {
                              event.preventDefault();
                              const pasted = event.clipboardData.getData("text");
                              setValue("phone", normalizeIndianPhone(pasted), { shouldValidate: true, shouldDirty: true });
                            }}
                          />
                        )}
                      />
                    </div>
                     {errors.phone && <p className="text-destructive text-xs">{errors.phone.message as string}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      disabled={submitting}
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...register("gender")}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    {errors.gender && <p className="text-destructive text-xs">{errors.gender.message as string}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      max={maxBirthDate}
                      autoComplete="bday"
                      disabled={submitting}
                      className="h-11 rounded-xl"
                      {...register("dateOfBirth")}
                    />
                    {errors.dateOfBirth && <p className="text-destructive text-xs">{errors.dateOfBirth.message as string}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 8 chars, 1 number, 1 uppercase"
                      autoComplete="new-password"
                      disabled={submitting}
                      className="h-11 rounded-xl"
                      {...register("password")}
                    />
                    {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
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
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message as string}</p>}
                  </div>
                </div>

                <div className="rounded-[1rem] border border-border/70 bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
                  Use your legal full name, a reachable email, and a valid 10-digit Indian mobile number. Verification continues using these exact details.
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#0f47cf,#2563eb_55%,#1d4ed8)] text-white shadow-[0_20px_34px_-22px_rgba(37,99,235,0.55)] hover:brightness-105"
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>

              <div className="mt-5 flex items-center justify-center border-t border-border/70 pt-4">
                <span className="text-sm text-muted-foreground">
                  Already have an account? <Link href="/auth/signin"><span className="text-primary font-medium hover:underline cursor-pointer">Sign in</span></Link>
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

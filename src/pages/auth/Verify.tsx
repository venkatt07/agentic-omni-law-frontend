import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useState } from "react";
import { useAppStore } from "@/store";
import BackButton from "@/components/app/BackButton";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { Loader2 } from "lucide-react";

export default function Verify() {
  const [, setLocation] = useLocation();
  const [value, setValue] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();
  const pendingEmail = typeof window !== "undefined" ? sessionStorage.getItem("pending_verify_email") || "" : "";
  const pendingPhone = typeof window !== "undefined" ? sessionStorage.getItem("pending_verify_phone") || "" : "";

  const handleVerify = async () => {
    if (value.length !== 6) return;
    const identifier = pendingEmail || pendingPhone;
    if (!identifier) {
      toast({ title: "Verification error", description: "Missing signup identifier. Please sign up again.", variant: "destructive" });
      return;
    }
    try {
      setVerifying(true);
      await authService.verify(identifier, value);
      toast({ title: "Verified", description: "Account verified. Please sign in." });
      setLocation("/auth/signin", { replace: true } as any);
    } catch (error) {
      toast({ title: "Verification failed", description: error instanceof Error ? error.message : "Invalid OTP", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <BackButton fallbackHref="/auth/signup" />
        </div>
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl text-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-heading mb-2">Verify your identity</h1>
          <p className="text-muted-foreground">We've sent a 6-digit code to your email{pendingEmail ? ` (${pendingEmail})` : ""}.</p>
        </div>

        <div className="flex justify-center mb-8">
          <InputOTP maxLength={6} value={value} onChange={setValue} disabled={verifying || resending}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button 
          className="w-full" 
          size="lg" 
          disabled={value.length !== 6 || verifying || resending}
          onClick={handleVerify}
        >
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {verifying ? "Verifying..." : "Verify & Continue"}
        </Button>

        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Didn't receive a code?{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline cursor-pointer"
              onClick={async () => {
                try {
                  setResending(true);
                  const identifier = pendingEmail || pendingPhone;
                  if (!identifier) throw new Error("Missing signup identifier.");
                  await authService.resend(identifier);
                  toast({ title: "OTP resent", description: "A new verification code has been sent." });
                } catch (error) {
                  toast({ title: "Resend failed", description: error instanceof Error ? error.message : "Unable to resend OTP", variant: "destructive" });
                } finally {
                  setResending(false);
                }
              }}
              disabled={verifying || resending}
            >
              {resending ? "Resending..." : "Resend"}
            </button>
          </span>
          <Link href="/auth/signup">
            <span className="text-sm text-muted-foreground hover:underline cursor-pointer">Back to sign up</span>
          </Link>
        </div>
      </Card>
      </div>
    </div>
  );
}

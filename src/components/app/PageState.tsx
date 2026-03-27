import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function LoadingState({ title, description }: StateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-[52vh] items-center justify-center overflow-hidden px-4 py-10 md:px-6 md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(28rem_18rem_at_50%_32%,rgba(56,189,248,0.08),transparent_62%),radial-gradient(24rem_16rem_at_50%_68%,rgba(99,102,241,0.08),transparent_68%)] dark:bg-[radial-gradient(28rem_18rem_at_50%_32%,rgba(59,130,246,0.08),transparent_62%),radial-gradient(24rem_16rem_at_50%_68%,rgba(139,92,246,0.08),transparent_68%)]" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/12 dark:border-sky-400/10"
        animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.35, 0.7, 0.35] }}
        transition={reduceMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 flex max-w-[28rem] flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-sky-400/20 dark:border-sky-400/16"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={reduceMotion ? undefined : { duration: 5.6, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-[8px] rounded-full border border-transparent border-t-sky-500/80 border-r-sky-400/40 dark:border-t-sky-300/80 dark:border-r-sky-400/35"
            animate={reduceMotion ? undefined : { rotate: -360 }}
            transition={reduceMotion ? undefined : { duration: 1.35, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-[18px] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.85),rgba(186,230,253,0.24))] dark:bg-[radial-gradient(circle_at_50%_40%,rgba(125,211,252,0.2),rgba(30,41,59,0.05))]" />
          <Loader2 className="relative z-10 h-5 w-5 animate-spin text-sky-600 dark:text-sky-300" />
        </div>

        <div className="mt-6 min-w-0">
          <h3 className="text-[1.05rem] font-semibold tracking-tight text-foreground md:text-[1.15rem]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <motion.div
          aria-hidden="true"
          className="mt-5 h-px w-28 bg-[linear-gradient(90deg,transparent,rgba(56,189,248,0.75),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.65),transparent)]"
          animate={reduceMotion ? undefined : { opacity: [0.35, 0.9, 0.35], scaleX: [0.9, 1.08, 0.9] }}
          transition={reduceMotion ? undefined : { duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: StateProps) {
  return (
    <Card className="p-10 text-center border-dashed bg-muted/20">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-6">{description}</p>
      {actionLabel ? (
        <Button onClick={onAction} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
}: StateProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Card className="relative overflow-hidden rounded-[28px] border-black/8 bg-white/86 p-6 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/40 dark:shadow-[0_24px_90px_-48px_rgba(0,0,0,0.68)] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(58%_52%_at_0%_0%,rgba(248,113,113,0.08),transparent_44%)] dark:bg-[radial-gradient(58%_52%_at_0%_0%,rgba(248,113,113,0.1),transparent_44%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-destructive/18 bg-destructive/[0.06]">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="mt-2 max-w-[48ch] text-sm leading-7 text-muted-foreground">{description}</p>
            {actionLabel ? (
              <Button
                variant="outline"
                className="mt-5 rounded-full px-5"
                onClick={onAction}
                type="button"
              >
                {actionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

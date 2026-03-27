import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Search, Mic, Sparkles, Info, Upload, Paperclip, X, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTypewriterHint } from "@/hooks/useTypewriterHint";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AnimatedGridPattern } from "@/lib/magic-ui";

interface LegalIssueHeroCardProps {
  title?: string;
  subtitle?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onUploadClick: () => void;
  hints: string[];
  uploadedFiles: string[];
  uploadingFiles?: string[];
  onRemoveUploadedFile?: (name: string) => void;
  onFocusChange?: (focused: boolean) => void;
  workspaceFileCount?: number;
  requireSelectedFilesForSubmit?: boolean;
  showWorkspaceFooter?: boolean;
  viewAllHref: string;
  submitting?: boolean;
  submitLabel?: string;
  className?: string;
}

export default function LegalIssueHeroCard({
  title = "Describe Your Legal Issue",
  subtitle = "Our AI will analyze and provide comprehensive legal intelligence",
  value,
  onValueChange,
  onSubmit,
  onUploadClick,
  hints,
  uploadedFiles,
  uploadingFiles = [],
  onRemoveUploadedFile,
  onFocusChange,
  workspaceFileCount = 0,
  requireSelectedFilesForSubmit = false,
  showWorkspaceFooter = true,
  viewAllHref,
  submitting = false,
  className,
}: LegalIssueHeroCardProps) {
  const { toast } = useToast();
  const [focused, setFocused] = useState(false);
  const hasUserValue = value.trim().length > 0;
  const hasVisibleInput = hasUserValue || uploadedFiles.length > 0 || uploadingFiles.length > 0;
  const { paused, renderedHint } = useTypewriterHint({
    hints,
    isFocused: focused,
    hasUserValue: hasVisibleInput,
  });
  const visibleFiles = uploadedFiles.slice(0, 2);
  const remaining = Math.max(0, uploadedFiles.length - visibleFiles.length);
  const visibleUploading = uploadingFiles.slice(0, 2);
  const remainingUploading = Math.max(0, uploadingFiles.length - visibleUploading.length);
  const hasUploadsInProgress = uploadingFiles.length > 0;
  const canAnalyze =
    (hasUserValue || uploadedFiles.length > 0 || (!requireSelectedFilesForSubmit && workspaceFileCount > 0)) &&
    !hasUploadsInProgress &&
    !submitting;
  const showHeader = title.trim().length > 0 || subtitle.trim().length > 0;

  const submit = () => {
    if (!canAnalyze) return;
    onSubmit(value.trim());
  };

  return (
    <motion.div transition={{ duration: 0.18, ease: "easeOut" }} className={cn("relative", className)}>
      <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/10 via-sky-500/5 to-indigo-500/10 blur-2xl opacity-70 dark:from-primary/20 dark:via-cyan-500/10 dark:to-violet-500/20" />
      <Card className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background/95 via-background/90 to-primary/[0.03] shadow-[0_10px_35px_-18px_rgba(59,130,246,0.25)] backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-white/10 dark:from-slate-950/90 dark:via-slate-950/80 dark:to-blue-950/20 dark:shadow-[0_14px_40px_-22px_rgba(96,165,250,0.35)]">
        <AnimatedGridPattern className="opacity-[0.08] dark:opacity-[0.12] [mask-image:radial-gradient(70%_90%_at_50%_0%,white,transparent)]" />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: focused
              ? [
                  "inset 0 0 0 1px rgba(59,130,246,0.2)",
                  "inset 0 0 0 1px rgba(99,102,241,0.34)",
                  "inset 0 0 0 1px rgba(59,130,246,0.2)",
                ]
              : "inset 0 0 0 1px rgba(148,163,184,0.1)",
          }}
          transition={{ duration: 1.6, repeat: focused ? Infinity : 0, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
          animate={{
            background: [
              "linear-gradient(90deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.18) 28%, rgba(99,102,241,0.18) 60%, rgba(59,130,246,0) 100%)",
              "linear-gradient(180deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.16) 28%, rgba(99,102,241,0.16) 60%, rgba(59,130,246,0) 100%)",
              "linear-gradient(270deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.18) 28%, rgba(99,102,241,0.18) 60%, rgba(59,130,246,0) 100%)",
              "linear-gradient(0deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.16) 28%, rgba(99,102,241,0.16) 60%, rgba(59,130,246,0) 100%)",
            ],
          }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-primary to-indigo-500" />
        <div className="relative p-5 md:p-6">
          {showHeader ? (
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/15 to-sky-500/10 text-primary shadow-sm dark:border-primary/30 dark:from-primary/20 dark:to-sky-400/10">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                {title.trim().length > 0 ? (
                  <h2 className="text-2xl font-bold font-heading tracking-tight md:text-3xl">{title}</h2>
                ) : null}
                {subtitle.trim().length > 0 ? (
                  <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground md:text-base">{subtitle}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <motion.div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-2 shadow-inner dark:border-white/10 dark:from-slate-900/90 dark:to-slate-950/90",
              showHeader ? "mt-5" : "",
            )}
            animate={
              focused
                ? {
                    boxShadow: [
                      "0 0 0 1px rgba(59,130,246,0.18), 0 8px 22px -16px rgba(59,130,246,0.25)",
                      "0 0 0 1px rgba(99,102,241,0.28), 0 12px 26px -14px rgba(99,102,241,0.32)",
                    ],
                  }
                : {
                    boxShadow: "0 0 0 1px rgba(148,163,184,0.08), 0 6px 18px -16px rgba(15,23,42,0.14)",
                  }
            }
            transition={{ duration: 0.2 }}
          >
            <Search className="absolute left-5 top-5 h-5 w-5 text-primary/80" />
            <Textarea
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onFocus={() => {
                setFocused(true);
                onFocusChange?.(true);
              }}
              onBlur={() => {
                setFocused(false);
                onFocusChange?.(false);
              }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canAnalyze) {
                  event.preventDefault();
                  submit();
                }
              }}
              aria-label="Legal Issue Input"
              className="min-h-[150px] resize-none border-0 bg-gradient-to-b from-background/80 to-background/40 py-4 pl-12 pr-16 text-sm leading-relaxed shadow-none focus-visible:ring-0 md:text-base dark:from-slate-900/30 dark:to-slate-950/10"
              placeholder="Describe your legal situation in detail... include relevant facts, dates, parties..."
            />
            {!hasUserValue ? (
              <motion.span
                key={`${renderedHint.length}`}
                initial={{ opacity: 0.55 }}
                animate={{ opacity: paused ? 0 : 1 }}
                className="pointer-events-none absolute left-12 right-20 top-4 whitespace-pre-wrap text-sm text-muted-foreground"
                data-testid="legal-issue-hint"
              >
                {renderedHint}
              </motion.span>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 h-9 w-9 rounded-full border border-border/60 bg-background/70 shadow-sm hover:border-primary/30 hover:bg-primary/5 dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-primary/10"
              aria-label="Voice input"
              onClick={() =>
                toast({
                  title: "Voice input coming soon",
                  description: "We are preparing secure voice capture for legal dictation.",
                })
              }
            >
              <Mic className="h-4 w-4" />
            </Button>

            {(uploadingFiles.length > 0 || uploadedFiles.length > 0) ? (
              <div className="flex flex-wrap gap-2 px-3 pb-2 md:px-4">
                {visibleUploading.map((file) => (
                  <span
                    key={`uploading:${file}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                  >
                    <motion.span
                      className="inline-block h-2 w-2 rounded-full bg-primary"
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    />
                    Uploading {file}
                  </span>
                ))}
                {remainingUploading > 0 ? (
                  <span className="rounded-full border border-border/70 bg-muted px-2 py-1 text-xs">
                    +{remainingUploading} uploading
                  </span>
                ) : null}
                {uploadedFiles.map((file) => (
                  <span
                    key={`uploaded:${file}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2 py-1 text-xs text-foreground dark:border-primary/30 dark:bg-primary/10"
                  >
                    <Paperclip className="h-3 w-3" />
                    {file}
                    {onRemoveUploadedFile ? (
                      <button
                        type="button"
                        aria-label={`Remove ${file}`}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                        onClick={() => onRemoveUploadedFile(file)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </motion.div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onUploadClick}
              aria-label="Upload documents shortcut"
              className="gap-2 rounded-xl border-border/70 bg-background/60 hover:bg-muted/60 dark:border-white/10 dark:bg-slate-900/50"
            >
              <Upload className="h-4 w-4" />
              Upload Documents
            </Button>
            <motion.div transition={{ duration: 0.15 }} className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 via-primary to-indigo-500 blur-md opacity-25 dark:opacity-35" />
              <Button
                type="button"
                onClick={submit}
                disabled={!canAnalyze}
                size="icon"
                aria-label={submitting ? "Submitting legal issue" : "Send legal issue"}
                className="relative h-12 w-12 rounded-full border-0 bg-gradient-to-r from-sky-500 via-primary to-indigo-500 text-white shadow-[0_10px_24px_-14px_rgba(59,130,246,0.7)] transition-transform hover:scale-[1.03] hover:brightness-105 disabled:scale-100 disabled:opacity-55 dark:text-white"
              >
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 rounded-full skew-x-[-18deg] bg-white/25"
                  animate={canAnalyze ? { x: ["0%", "340%"] } : { x: "0%" }}
                  transition={canAnalyze ? { duration: 1.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" } : { duration: 0 }}
                />
                {submitting ? (
                  <motion.span
                    aria-hidden="true"
                    className="relative inline-block h-4 w-4 rounded-full border-2 border-white/35 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <ArrowUp className="relative h-4.5 w-4.5" />
                )}
              </Button>
            </motion.div>
          </div>

          {showWorkspaceFooter ? (
            <div className="mt-3 text-xs text-muted-foreground">
              <p className="mb-2 inline-flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary/80" />
                Upload-once workspace is reused across Query Parsing and all agents.
              </p>
              {uploadedFiles.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">Uploaded:</span>
                  {visibleFiles.map((file) => (
                    <span
                      key={file}
                      className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-foreground dark:border-primary/30 dark:bg-primary/10"
                    >
                      {file}
                    </span>
                  ))}
                  {remaining > 0 ? (
                    <span className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 dark:border-white/10">
                      +{remaining} more
                    </span>
                  ) : null}
                  <Link href={viewAllHref}>
                    <span className="cursor-pointer text-primary hover:underline">View all</span>
                  </Link>
                </div>
              ) : (
                <p>
                  {workspaceFileCount > 0
                    ? `${workspaceFileCount} workspace file${workspaceFileCount > 1 ? "s" : ""} available for analysis.`
                    : "No files uploaded yet. Upload to analyze documents."}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </Card>
    </motion.div>
  );
}

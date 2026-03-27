import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTypewriterHint } from "@/hooks/useTypewriterHint";
import { cn } from "@/lib/utils";
import { Plus, ArrowUp, Paperclip, ClipboardPaste, X, Sparkles, FileSearch, Orbit, FileText } from "lucide-react";
import ThemeBackdrop from "@/components/app/ThemeBackdrop";

interface PromptCanvasComposerProps {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onUploadClick: () => void;
  hints: string[];
  uploadedFiles: string[];
  uploadingFiles?: string[];
  requireSelectedFilesForSubmit?: boolean;
  onRemoveUploadedFile?: (name: string) => void;
  onFocusChange?: (focused: boolean) => void;
  workspaceFileCount?: number;
  availableWorkspaceFiles?: string[];
  onToggleWorkspaceFile?: (name: string) => void;
  viewAllHref: string;
  submitting?: boolean;
  showWorkspaceFooter?: boolean;
  showInlineAttachments?: boolean;
  className?: string;
}

export default function PromptCanvasComposer({
  title = "Describe Your Legal Issue",
  subtitle = "Our AI will analyze and provide comprehensive legal intelligence",
  showHeader = true,
  value,
  onValueChange,
  onSubmit,
  onUploadClick,
  hints,
  uploadedFiles,
  uploadingFiles = [],
  requireSelectedFilesForSubmit = false,
  onRemoveUploadedFile,
  onFocusChange,
  workspaceFileCount = 0,
  availableWorkspaceFiles = [],
  onToggleWorkspaceFile,
  viewAllHref,
  submitting = false,
  showWorkspaceFooter = true,
  showInlineAttachments = true,
  className,
}: PromptCanvasComposerProps) {
  const { toast } = useToast();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasUserValue = value.trim().length > 0;
  const hasVisibleInput = hasUserValue || uploadedFiles.length > 0 || uploadingFiles.length > 0;
  const hasAttachmentRows = uploadedFiles.length > 0 || uploadingFiles.length > 0;
  const borderPaused = focused || hovered;

  const { renderedHint, paused } = useTypewriterHint({
    hints,
    isFocused: focused,
    hasUserValue: hasVisibleInput,
    typeSpeedMs: 28,
    deleteSpeedMs: 16,
    holdMs: 1500,
    deleteHoldMs: 500,
  });

  const visibleFiles = uploadedFiles.slice(0, 2);
  const remaining = Math.max(0, uploadedFiles.length - visibleFiles.length);
  const visibleUploading = uploadingFiles.slice(0, 2);
  const remainingUploading = Math.max(0, uploadingFiles.length - visibleUploading.length);
  const hasUploadsInProgress = uploadingFiles.length > 0;
  const hasSubmitInput =
    hasUserValue || uploadedFiles.length > 0 || (!requireSelectedFilesForSubmit && workspaceFileCount > 0);
  const canSubmit = hasSubmitInput && !hasUploadsInProgress && !submitting;
  const workspaceSelectableFiles = availableWorkspaceFiles.filter(Boolean);
  const expandedTextareaClass = focused
    ? "min-h-[128px] sm:min-h-[136px] md:min-h-[150px]"
    : "min-h-[90px] sm:min-h-[98px] md:min-h-[108px]";

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
  };

  useEffect(() => {
    return () => {
      if (pointerFrameRef.current != null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    };
  }, []);

  return (
    <section data-testid="prompt-canvas-composer" className={cn("relative", className)}>
      <ThemeBackdrop
        variant="minimal"
        className="mx-auto w-full max-w-[68rem] p-0 md:p-0"
        contentClassName="mx-auto w-full max-w-[68rem]"
      >
        <div
          ref={surfaceRef}
          className="relative mx-auto w-full max-w-[68rem]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);
            if (surfaceRef.current) {
              surfaceRef.current.style.setProperty("--prompt-px", "50%");
              surfaceRef.current.style.setProperty("--prompt-py", "34%");
            }
          }}
          onMouseMove={(event) => {
            const node = surfaceRef.current;
            if (!node) return;
            const bounds = node.getBoundingClientRect();
            const nextX = `${(((event.clientX - bounds.left) / bounds.width) * 100).toFixed(2)}%`;
            const nextY = `${(((event.clientY - bounds.top) / bounds.height) * 100).toFixed(2)}%`;
            if (pointerFrameRef.current != null) window.cancelAnimationFrame(pointerFrameRef.current);
            pointerFrameRef.current = window.requestAnimationFrame(() => {
              node.style.setProperty("--prompt-px", nextX);
              node.style.setProperty("--prompt-py", nextY);
            });
          }}
        >
          <div aria-hidden="true" className={cn("prompt-crawl-border", borderPaused && "prompt-crawl-border-paused")} />
          <div aria-hidden="true" className="prompt-shell-orb-a pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-80" />
          <div aria-hidden="true" className="prompt-shell-orb-b pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-75" />
          <div aria-hidden="true" className={cn("prompt-pointer-glow pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-0 transition-opacity duration-200 dark:hidden", hovered && !focused && "opacity-100")} />
          <div aria-hidden="true" className={cn("prompt-pointer-glow-dark pointer-events-none absolute inset-0 hidden rounded-[1.75rem] opacity-0 transition-opacity duration-200 dark:block", hovered && !focused && "opacity-100")} />
          <div aria-hidden="true" className={cn("prompt-pointer-halo pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-0 transition-opacity duration-200", hovered && !focused && "opacity-100")} />
          <form
            className="relative overflow-hidden rounded-[1.65rem] p-0"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {submitting ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/72 backdrop-blur-md dark:bg-black/46">
                <div className="flex items-center gap-3 rounded-full border border-black/8 bg-white/88 px-4 py-2 text-sm font-medium text-slate-800 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.08] dark:text-white">
                  <motion.span
                    className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500 dark:bg-sky-300"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  />
                  Preparing agent run
                </div>
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-0 rounded-[1.65rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(246,248,252,0.76))] dark:bg-[linear-gradient(180deg,rgba(8,8,10,0.96),rgba(10,10,13,0.98))]" />
            <div className="prompt-surface-flow pointer-events-none absolute inset-0 rounded-[1.65rem] opacity-80 dark:opacity-55" />
            <div className="pointer-events-none absolute inset-0 rounded-[1.65rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_24px_60px_-34px_rgba(15,23,42,0.16)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_54px_-28px_rgba(0,0,0,0.68)]" />

            {showHeader ? (
              <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-muted-foreground">Legal Command Surface</div>
                  <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground md:text-[1.22rem]">{title}</h2>
                  <p className="mt-1.5 max-w-[58ch] text-[13px] leading-6 text-muted-foreground md:text-sm">{subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Case aware
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                    <FileSearch className="h-3.5 w-3.5" />
                    Acts + docs
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
                    <Orbit className="h-3.5 w-3.5" />
                    Reasoned output
                  </span>
                </div>
              </div>
            ) : null}

            <div
              className={cn(
                "relative overflow-hidden rounded-none bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.1))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0.01))]",
                focused
                  ? "shadow-[0_26px_60px_-34px_rgba(15,23,42,0.14)] dark:shadow-[0_24px_58px_-26px_rgba(0,0,0,0.72)]"
                  : "shadow-[0_14px_32px_-28px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.62)]",
              )}
              >
                <div className="prompt-inner-wave pointer-events-none absolute inset-0 rounded-none opacity-85 dark:opacity-45" />
                <div className={cn("prompt-inner-pointer pointer-events-none absolute inset-0 rounded-none opacity-0 transition-opacity duration-200 dark:hidden", hovered && !focused && "opacity-100")} />
                <div className={cn("prompt-inner-pointer-dark pointer-events-none absolute inset-0 hidden rounded-none opacity-0 transition-opacity duration-200 dark:block", hovered && !focused && "opacity-100")} />
                <div className="pointer-events-none absolute inset-0 rounded-none bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent_20%,transparent_78%,rgba(255,255,255,0.04))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_22%,transparent_80%,rgba(255,255,255,0.01))]" />
              <div className="flex min-h-full flex-col">
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
                    if (event.nativeEvent.isComposing) return;
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  aria-label="Legal Issue Input"
                  className={cn(
                    "resize-none rounded-none border-0 bg-transparent px-4 py-4 text-[15px] leading-7 shadow-none transition-[min-height,padding] duration-200 ease-out focus-visible:ring-0 md:px-6 md:py-4 md:text-[16px]",
                    focused || hasUserValue ? expandedTextareaClass : "min-h-[82px] sm:min-h-[90px] md:min-h-[96px]",
                  )}
                  placeholder=""
                />

                {showInlineAttachments && hasAttachmentRows ? (
                  <div className="border-t border-black/5 px-4 py-2.5 md:px-6 dark:border-white/8">
                    <div className="flex flex-wrap gap-2">
                      {visibleUploading.map((file) => (
                        <span
                          key={`uploading:${file}`}
                          className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-primary/15 bg-background/80 px-2.5 py-2 text-xs text-foreground shadow-[0_10px_24px_-20px_rgba(15,23,42,0.28)] backdrop-blur-sm dark:bg-white/[0.04]"
                        >
                          <motion.span
                            className="inline-block h-2 w-2 rounded-full bg-primary"
                            animate={{ opacity: [0.35, 1, 0.35] }}
                            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                          />
                          <span className="truncate">Uploading {file}</span>
                        </span>
                      ))}
                      {remainingUploading > 0 ? (
                        <span className="inline-flex items-center rounded-2xl border border-border/70 bg-background/70 px-2.5 py-2 text-xs text-muted-foreground">
                          +{remainingUploading} uploading
                        </span>
                      ) : null}
                      {uploadedFiles.map((file) => (
                        <span
                          key={`uploaded:${file}`}
                          className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-black/8 bg-background/88 px-2.5 py-2 text-xs text-foreground shadow-[0_12px_24px_-22px_rgba(15,23,42,0.3)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.045]"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:bg-violet-500/12 dark:text-violet-200">
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                          <span className="max-w-[10rem] truncate sm:max-w-[12rem] md:max-w-[14rem]">{file}</span>
                          {onRemoveUploadedFile ? (
                            <button
                              type="button"
                              aria-label={`Remove ${file}`}
                              className="ml-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/8 dark:hover:text-white"
                              onClick={() => onRemoveUploadedFile(file)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {!hasVisibleInput && !focused ? (
                <div className="pointer-events-none absolute inset-x-6 top-5 text-[0.95rem] leading-7 text-muted-foreground md:inset-x-7 md:text-[1rem]">
                  <span data-testid="legal-issue-hint">{renderedHint}</span>
                  <motion.span
                    className="ml-0.5 inline-block h-5 w-[2px] rounded-full bg-primary/70 align-middle"
                    animate={{ opacity: paused ? 0 : [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              ) : null}

              <motion.div
                className="flex flex-wrap items-center justify-between gap-3 bg-transparent px-4 py-3 dark:bg-transparent md:px-6"
                animate={focused ? { opacity: 1, y: 0 } : { opacity: 0.94, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Prompt quick actions"
                        className="h-11 w-11 rounded-full border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(241,245,249,0.84))] text-slate-700 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.16)] hover:border-black/12 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.9))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] dark:text-white/88 dark:shadow-[0_16px_34px_-20px_rgba(0,0,0,0.58)] dark:hover:border-white/16 dark:hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.06))]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel>Prompt Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onUploadClick}>
                        <Paperclip className="h-4 w-4" />
                        Upload Documents
                      </DropdownMenuItem>
                      {workspaceSelectableFiles.length > 0 ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                            Workspace files
                          </DropdownMenuLabel>
                          {workspaceSelectableFiles.map((file) => (
                            <DropdownMenuCheckboxItem
                              key={file}
                              checked={uploadedFiles.includes(file)}
                              onCheckedChange={() => onToggleWorkspaceFile?.(file)}
                              className="max-w-[16rem]"
                            >
                              <span className="truncate">{file}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </>
                      ) : null}
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText();
                            onValueChange(clip);
                          } catch {
                            toast({
                              title: "Paste text unavailable",
                              description: "Clipboard access is blocked. Paste manually into the prompt.",
                            });
                          }
                        }}
                      >
                        <ClipboardPaste className="h-4 w-4" />
                        Paste Text
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden text-[10px] uppercase tracking-[0.16em] text-muted-foreground dark:text-white/50 lg:block">
                    Ctrl/Cmd + Enter
                  </div>
                  <motion.button
                    type="submit"
                    aria-label="Analyze with AI"
                    disabled={!canSubmit}
                    whileTap={canSubmit ? { scale: 0.985 } : {}}
                    className={cn(
                      "relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1.15rem] border text-slate-950 transition",
                      "border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,244,251,0.92))] shadow-[0_18px_40px_-20px_rgba(15,23,42,0.24)]",
                      "dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(235,235,240,0.88))] dark:text-black dark:shadow-[0_18px_36px_-18px_rgba(0,0,0,0.52)]",
                      canSubmit ? "cursor-pointer hover:-translate-y-[1px] hover:border-black/12 hover:shadow-[0_22px_44px_-20px_rgba(15,23,42,0.28)] dark:hover:border-white/14 dark:hover:shadow-[0_22px_42px_-18px_rgba(0,0,0,0.6)]" : "cursor-not-allowed",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50",
                    )}
                  >
                    <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent_45%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_45%)]" />
                    <ArrowUp className="relative h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {showWorkspaceFooter ? (
              <div className="mt-3 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:flex">
                <span className="inline-flex items-center gap-1">Upload-once workspace reused across all agents.</span>
                {uploadedFiles.length > 0 ? (
                  <>
                    <span className="text-muted-foreground/80">Uploaded:</span>
                    {visibleFiles.map((file) => (
                      <span
                        key={file}
                        className="rounded-full border border-sky-200/80 bg-sky-50 px-2 py-0.5 text-sky-800 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200"
                      >
                        {file}
                      </span>
                    ))}
                    {remaining > 0 ? (
                      <span className="rounded-full border border-border/70 bg-muted px-2 py-0.5">+{remaining} more</span>
                    ) : null}
                    <Link href={viewAllHref}>
                      <span className="cursor-pointer text-primary hover:underline">View all</span>
                    </Link>
                  </>
                ) : (
                  <span>No files uploaded yet. Upload to analyze documents.</span>
                )}
              </div>
            ) : null}
          </form>
        </div>
      </ThemeBackdrop>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, FileText, Sparkles, TerminalSquare, XCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { autoTranslateUiText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import type { RunLogLine } from "./useRunState";

interface ActivityStreamProps {
  lines: RunLogLine[];
  compact?: boolean;
  elapsedLabel?: string;
}

function getRevealDelay(line?: RunLogLine) {
  if (!line) return 900;
  const phase = String(line.phase || "").toLowerCase();
  if (line.tone === "live") return 1100;
  if (line.tone === "success" || line.tone === "error") return 850;
  if (phase.includes("thinking")) return 980;
  if (phase.includes("reading")) return 900;
  if (phase.includes("planning")) return 960;
  return 820;
}

function estimateSequentialRevealMs(line?: RunLogLine) {
  if (!line) return 900;
  const title = `${line.actor ? `${line.actor}: ` : ""}${line.text || ""}`;
  const detail = line.detail || "";
  const titleMs = Math.min(1800, Math.max(420, title.length * 18));
  const detailMs = detail ? Math.min(2600, Math.max(640, detail.length * 12)) : 220;
  return titleMs + detailMs + getRevealDelay(line);
}

function getExplicitAnchorId(lines: RunLogLine[]) {
  return (
    lines.find((line) => line.state === "active" || line.state === "error")?.id ||
    [...lines].reverse().find((line) => line.state === "completed")?.id ||
    lines[0]?.id
  );
}

function eventIcon(line: RunLogLine) {
  if (line.tone === "success") return CheckCircle2;
  if (line.tone === "error") return XCircle;
  if ((line.phase || "").toLowerCase().includes("reading")) return FileText;
  if ((line.phase || "").toLowerCase().includes("thinking")) return Sparkles;
  if ((line.phase || "").toLowerCase().includes("doing")) return TerminalSquare;
  return Sparkles;
}

function useTypedText(text: string, animate: boolean, speed = 22, hiddenUntilAnimate = false) {
  const [visibleLength, setVisibleLength] = useState(
    animate ? 0 : hiddenUntilAnimate ? 0 : text.length,
  );

  useEffect(() => {
    setVisibleLength(animate ? 0 : hiddenUntilAnimate ? 0 : text.length);
  }, [animate, hiddenUntilAnimate, text]);

  useEffect(() => {
    if (!animate || visibleLength >= text.length) return;
    const timer = window.setTimeout(() => {
      setVisibleLength((current) => Math.min(current + 1, text.length));
    }, speed);
    return () => window.clearTimeout(timer);
  }, [animate, speed, text.length, visibleLength]);

  return text.slice(0, visibleLength);
}

function TimelineEntry({
  line,
  active,
  isLast,
  compact,
  expanded,
  onToggleExpanded,
  reduceMotion,
  translateUi,
  nextLabel,
}: {
  line: RunLogLine;
  active: boolean;
  isLast: boolean;
  compact: boolean;
  expanded: boolean;
  onToggleExpanded?: () => void;
  reduceMotion: boolean;
  translateUi: (value: string) => string;
  nextLabel: string;
}) {
  const Icon = eventIcon(line);
  const titleText = `${line.actor ? `${translateUi(line.actor)}: ` : ""}${translateUi(line.text)}`;
  const detailText = translateUi(line.detail || "");
  const typedTitle = useTypedText(titleText, active && !reduceMotion, 18);
  const titleComplete = typedTitle.length >= titleText.length;
  const detailAnimating = active && !reduceMotion && titleComplete;
  const typedDetail = useTypedText(detailText, detailAnimating, 12, active && !reduceMotion && !titleComplete);
  const detailComplete = detailText.length === 0 || (titleComplete && typedDetail.length >= detailText.length);
  const isUpcoming = line.state === "upcoming";
  const isCompleted = line.state === "completed";
  const isErrored = line.state === "error" || line.tone === "error";
  const canExpand = compact && !active && !isErrored && (!!line.detail || !!line.next);
  const showExpandedContent = !compact || active || isErrored || expanded;

  return (
    <motion.div
      data-activity-id={line.id}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "relative flex gap-3 pb-4 transition-opacity duration-200",
        isUpcoming ? "opacity-55" : "opacity-100",
      )}
    >
      <div className="relative flex w-8 shrink-0 flex-col items-center">
        <span
          className={cn(
            "relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-[0_10px_24px_-20px_rgba(15,23,42,0.24)]",
            isCompleted || line.tone === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : isErrored
                ? "border-destructive/25 bg-destructive/10 text-destructive"
                : active
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-black/8 bg-black/[0.03] text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.03]",
          )}
        >
          {active && line.tone === "live" ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary/90 shadow-[0_0_0_3px_rgba(59,130,246,0.14)] animate-pulse"
            />
          ) : null}
          <Icon className="h-4 w-4" />
        </span>
        {!isLast ? <span className="mt-2 flex-1 w-px rounded-full bg-black/8 dark:bg-white/[0.08]" /> : null}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/90">
            {translateUi(line.phase || (isUpcoming ? "Planned" : "Working"))}
          </span>
          {line.timestamp ? <span className="font-mono text-[11px] text-muted-foreground">{line.timestamp}</span> : null}
          {canExpand ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-black/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-black/12 hover:text-foreground dark:border-white/[0.08] dark:hover:border-white/[0.14] dark:hover:text-white"
              onClick={onToggleExpanded}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Collapse" : "Expand"}
            </button>
          ) : null}
        </div>

        <div className={cn("mt-1 text-[0.98rem] font-medium leading-6 text-foreground break-words", isUpcoming && "text-foreground/75", active && "text-foreground")}>
          {active ? typedTitle : `${line.actor ? `${translateUi(line.actor)}: ` : ""}${translateUi(line.text)}`}
          {active && !reduceMotion ? (
            <motion.span
              aria-hidden="true"
              className="ml-0.5 inline-flex text-primary"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              |
            </motion.span>
          ) : null}
        </div>

        {line.detail && showExpandedContent ? (
          <div className="mt-1 text-[0.92rem] leading-6 text-muted-foreground break-words">
            {active ? typedDetail : translateUi(line.detail)}
          </div>
        ) : null}

        {line.next && showExpandedContent && (!active || detailComplete || reduceMotion) ? (
          <div className="mt-2 text-[12px] font-medium text-foreground/80 break-words">
            {nextLabel}: <span className="text-muted-foreground">{translateUi(line.next)}</span>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function PendingTypingCue({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pb-5 pt-1">
      <div className="flex w-8 shrink-0 justify-center">
        <div className="flex items-end gap-1 rounded-full border border-black/8 bg-black/[0.02] px-2 py-2 dark:border-white/[0.08] dark:bg-white/[0.03]">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              aria-hidden="true"
              className="h-4 w-[3px] rounded-full bg-primary/70"
              animate={
                reduceMotion
                  ? { opacity: 0.55 }
                  : { opacity: [0.3, 1, 0.3], scaleY: [0.65, 1.15, 0.65] }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: index * 0.16 }
              }
            />
          ))}
        </div>
      </div>
      <motion.div
        className="pt-0.5 text-[0.9rem] font-medium text-black dark:text-white"
        animate={
          reduceMotion
            ? { opacity: 0.94 }
            : {
                opacity: [0.72, 1, 0.72],
                textShadow: [
                  "0 0 0 rgba(15,23,42,0)",
                  "0 0 18px rgba(15,23,42,0.16)",
                  "0 0 0 rgba(15,23,42,0)",
                ],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 1.45, repeat: Infinity, ease: "easeInOut" }
        }
      >
        Preparing the next activity...
      </motion.div>
    </div>
  );
}

export default function ActivityStream({
  lines,
  compact = false,
  elapsedLabel,
}: ActivityStreamProps) {
  const { t } = useI18n();
  const language = useAppStore((state) => state.language);
  const isMobile = useIsMobile();
  const translateUi = (value: string) => autoTranslateUiText(value, language);
  const reduceMotion = useReducedMotion();
  const visibleLines = useMemo(() => lines, [lines]);
  const hasExplicitStates = useMemo(
    () => visibleLines.some((line) => typeof line.state === "string"),
    [visibleLines],
  );
  const lineIdsSignature = useMemo(
    () =>
      visibleLines
        .map((line) => line.id)
        .join("||"),
    [visibleLines],
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sequentialTranscriptSignatureRef = useRef("");
  const sequentialRenderedIdsRef = useRef<string[]>([]);
  const explicitTranscriptSignatureRef = useRef("");
  const autoScrollingRef = useRef(false);
  const followLatestRef = useRef(true);
  const queuedScrollFrameRef = useRef<number | null>(null);
  const queuedScrollTimeoutRef = useRef<number | null>(null);
  const appendEnforceTimeoutRef = useRef<number | null>(null);
  const [explicitVisibleIds, setExplicitVisibleIds] = useState<string[]>([]);
  const [expandedLineIds, setExpandedLineIds] = useState<string[]>([]);
  const [revealedCount, setRevealedCount] = useState(
    reduceMotion ? visibleLines.length : Math.min(1, visibleLines.length),
  );
  const [waitingCueVisible, setWaitingCueVisible] = useState(false);

  useEffect(() => {
    if (!hasExplicitStates) {
      explicitTranscriptSignatureRef.current = "";
      setExplicitVisibleIds([]);
      return;
    }

    setExplicitVisibleIds((current) => {
      const sourceIds = visibleLines.map((line) => line.id);
      if (!sourceIds.length) {
        return current.length ? [] : current;
      }

      const sourceIdSet = new Set(sourceIds);
      const structureChanged = explicitTranscriptSignatureRef.current !== lineIdsSignature;
      explicitTranscriptSignatureRef.current = lineIdsSignature;

      const anchorId = getExplicitAnchorId(visibleLines) || sourceIds[0];
      const anchorIndex = Math.max(0, sourceIds.indexOf(anchorId));
      const nextVisibleIds = current.filter((id) => sourceIdSet.has(id));
      const hasOverlap = nextVisibleIds.length > 0;
      if (!current.length || (structureChanged && !hasOverlap)) {
        const resetIds = sourceIds.slice(0, anchorIndex + 1);
        return resetIds.length === current.length && resetIds.every((id, index) => current[index] === id)
          ? current
          : resetIds;
      }

      for (let index = 0; index <= anchorIndex; index += 1) {
        const id = sourceIds[index];
        if (id && !nextVisibleIds.includes(id)) {
          nextVisibleIds.push(id);
        }
      }

      const resolvedIds = nextVisibleIds.length ? nextVisibleIds : anchorId ? [anchorId] : sourceIds.slice(0, 1);
      return resolvedIds.length === current.length && resolvedIds.every((id, index) => current[index] === id)
        ? current
        : resolvedIds;
    });
  }, [hasExplicitStates, lineIdsSignature, visibleLines]);

  const explicitRenderedLines = useMemo(() => {
    if (!hasExplicitStates) return visibleLines;
    const explicitVisibleIdSet = new Set(explicitVisibleIds);
    const rendered = visibleLines.filter((line) => explicitVisibleIdSet.has(line.id));
    if (rendered.length) return rendered;
    const anchorId = getExplicitAnchorId(visibleLines);
    return anchorId ? visibleLines.filter((line) => line.id === anchorId) : visibleLines.slice(0, 1);
  }, [explicitVisibleIds, hasExplicitStates, visibleLines]);

  useEffect(() => {
    if (reduceMotion) {
      setRevealedCount(visibleLines.length);
      sequentialRenderedIdsRef.current = visibleLines.map((line) => line.id);
      return;
    }
    if (hasExplicitStates) {
      setRevealedCount(explicitRenderedLines.length);
      sequentialRenderedIdsRef.current = [];
      return;
    }
    const nextIds = visibleLines.map((line) => line.id);
    const previousIds = sequentialRenderedIdsRef.current;
    const isAppendOnly =
      previousIds.length > 0 &&
      nextIds.length >= previousIds.length &&
      previousIds.every((id, index) => nextIds[index] === id);
    const hasAnyOverlap =
      previousIds.length > 0 && previousIds.some((id) => nextIds.includes(id));
    const isNewTranscript =
      sequentialTranscriptSignatureRef.current !== lineIdsSignature &&
      !isAppendOnly &&
      !hasAnyOverlap;
    sequentialTranscriptSignatureRef.current = lineIdsSignature;
    sequentialRenderedIdsRef.current = nextIds;
    setRevealedCount((current) => {
      if (!visibleLines.length) return 0;
      if (isNewTranscript) return 1;
      if (visibleLines.length < current) return visibleLines.length;
      return Math.max(1, current);
    });

    const timers: number[] = [];
    let accumulatedMs = 0;
    for (let index = 1; index < visibleLines.length; index += 1) {
      accumulatedMs += estimateSequentialRevealMs(visibleLines[index - 1]);
      const nextCount = index + 1;
      timers.push(
        window.setTimeout(() => {
          setRevealedCount((current) => Math.max(current, nextCount));
        }, accumulatedMs),
      );
    }
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [explicitRenderedLines.length, hasExplicitStates, lineIdsSignature, reduceMotion]);

  const renderedLines = hasExplicitStates
    ? explicitRenderedLines
    : reduceMotion
      ? visibleLines
      : visibleLines.slice(0, revealedCount);

  useEffect(() => {
    setExpandedLineIds((current) => {
      const validIds = current.filter((id) => renderedLines.some((line) => line.id === id));
      const nextIds = [...validIds];
      for (const line of renderedLines) {
        if ((line.state === "active" || line.state === "error") && !nextIds.includes(line.id)) {
          nextIds.push(line.id);
        }
      }
      return nextIds.length === current.length && nextIds.every((id, index) => current[index] === id)
        ? current
        : nextIds;
    });
  }, [renderedLines]);

  const renderedLineIdsSignature = useMemo(
    () => renderedLines.map((line) => line.id).join("||"),
    [renderedLines],
  );
  const shouldShowWaitingCue = waitingCueVisible;
  const lastRenderedLine = renderedLines.at(-1);
  const canShowWaitingCue =
    !!lastRenderedLine &&
    lastRenderedLine.tone !== "error" &&
    lastRenderedLine.state !== "error";

  useEffect(() => {
    if (!canShowWaitingCue) {
      setWaitingCueVisible(false);
      return;
    }

    setWaitingCueVisible(false);
    const baseDelay = lastRenderedLine?.state === "active"
      ? estimateSequentialRevealMs(lastRenderedLine) + 180
      : 1450;
    const timer = window.setTimeout(
      () => setWaitingCueVisible(true),
      reduceMotion ? 0 : baseDelay,
    );
    return () => window.clearTimeout(timer);
  }, [canShowWaitingCue, lastRenderedLine, reduceMotion, renderedLineIdsSignature]);

  const clearQueuedScroll = useCallback(() => {
    if (queuedScrollFrameRef.current != null) {
      window.cancelAnimationFrame(queuedScrollFrameRef.current);
      queuedScrollFrameRef.current = null;
    }
    if (queuedScrollTimeoutRef.current != null) {
      window.clearTimeout(queuedScrollTimeoutRef.current);
      queuedScrollTimeoutRef.current = null;
    }
    if (appendEnforceTimeoutRef.current != null) {
      window.clearTimeout(appendEnforceTimeoutRef.current);
      appendEnforceTimeoutRef.current = null;
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const node = scrollRef.current;
    if (!node) return;
    autoScrollingRef.current = true;
    node.scrollTo({
      top: Math.max(0, node.scrollHeight - node.clientHeight),
      behavior,
    });
    const releaseDelayMs = behavior === "smooth" ? (isMobile ? 140 : 260) : 80;
    window.setTimeout(() => {
      autoScrollingRef.current = false;
    }, releaseDelayMs);
  }, [isMobile]);

  const enforceAppendBottomLock = useCallback(() => {
    const run = () => {
      const node = scrollRef.current;
      if (!node) return;
      scrollToBottom("auto");
    };

    run();
    appendEnforceTimeoutRef.current = window.setTimeout(() => {
      appendEnforceTimeoutRef.current = null;
      run();
    }, isMobile ? 60 : 120);
  }, [isMobile, scrollToBottom]);

  const queueScrollToBottom = useCallback((mode: "append" | "resize" | "reset") => {
    clearQueuedScroll();
    if (mode === "append") {
      followLatestRef.current = true;
      enforceAppendBottomLock();
      return;
    }
    const behavior: ScrollBehavior =
      reduceMotion || isMobile
        ? "auto"
        : "auto";
    const delayMs = reduceMotion || isMobile ? 0 : mode === "resize" ? 48 : 0;

    const run = () => {
      queuedScrollFrameRef.current = window.requestAnimationFrame(() => {
        queuedScrollFrameRef.current = null;
        scrollToBottom(behavior);
      });
    };

    if (delayMs > 0) {
      queuedScrollTimeoutRef.current = window.setTimeout(() => {
        queuedScrollTimeoutRef.current = null;
        run();
      }, delayMs);
      return;
    }

    run();
  }, [clearQueuedScroll, enforceAppendBottomLock, isMobile, reduceMotion, scrollToBottom]);

  const isNearBottom = useCallback((node: HTMLDivElement) => {
    const distance = node.scrollHeight - node.clientHeight - node.scrollTop;
    return distance <= (isMobile ? 28 : 72);
  }, [isMobile]);

  useEffect(() => () => clearQueuedScroll(), [clearQueuedScroll]);

  const previousRenderedSignatureRef = useRef("");
  const previousRenderedCountRef = useRef(0);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const previousSignature = previousRenderedSignatureRef.current;
    const previousCount = previousRenderedCountRef.current;
    previousRenderedSignatureRef.current = renderedLineIdsSignature;
    previousRenderedCountRef.current = renderedLines.length;

    if (!renderedLines.length || previousSignature === renderedLineIdsSignature) return;
    if (renderedLines.length <= previousCount) return;
    queueScrollToBottom("append");
  }, [queueScrollToBottom, renderedLineIdsSignature, renderedLines]);

  useEffect(() => {
    const node = scrollRef.current;
    const content = contentRef.current;
    if (!node || !content) return;

    const observer = new ResizeObserver(() => {
      if (!followLatestRef.current) return;
      queueScrollToBottom("resize");
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [queueScrollToBottom]);

  useEffect(() => {
    if (!renderedLines.length) return;
    followLatestRef.current = true;
    queueScrollToBottom("reset");
  }, [queueScrollToBottom]);

  const activeSequentialId = hasExplicitStates
    ? renderedLines.find((line) => line.state === "active" || line.state === "error")?.id || renderedLines.at(-1)?.id
    : renderedLines.at(-1)?.id;

  return (
    <section aria-label={t("run.activity")} className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[1.05rem] font-semibold text-foreground">{t("run.activity")}</span>
          {elapsedLabel ? <span className="text-sm text-muted-foreground">{"\u00b7"} {elapsedLabel}</span> : null}
        </div>
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "min-h-[14rem]" : "min-h-[18rem]")}>
        <div className="mb-3">
          <span className="text-[1.12rem] font-semibold text-foreground">{t("run.thinking")}</span>
        </div>

        {renderedLines.length ? (
          <div
            ref={scrollRef}
            onScroll={() => {
              if (autoScrollingRef.current) return;
              const node = scrollRef.current;
              if (!node) return;
              followLatestRef.current = isNearBottom(node);
            }}
            className={cn(
              "app-scrollbar min-h-0 h-full flex-1 overflow-y-auto overscroll-contain pr-1",
            )}
          >
            <div ref={contentRef} className="pb-4">
              {renderedLines.map((line, index) => (
                <TimelineEntry
                  key={line.id}
                  line={line}
                  active={
                    line.id === activeSequentialId &&
                    (!hasExplicitStates || line.state === "active" || line.state === "error")
                  }
                  isLast={index === renderedLines.length - 1}
                  compact={compact}
                  expanded={expandedLineIds.includes(line.id)}
                  onToggleExpanded={() =>
                    setExpandedLineIds((current) =>
                      current.includes(line.id)
                        ? current.filter((id) => id !== line.id)
                        : [...current, line.id],
                    )
                  }
                  reduceMotion={!!reduceMotion}
                  translateUi={translateUi}
                  nextLabel={t("run.next")}
                />
              ))}
              {shouldShowWaitingCue ? <PendingTypingCue reduceMotion={!!reduceMotion} /> : null}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t("run.noActivity")}</div>
        )}
      </div>
    </section>
  );
}

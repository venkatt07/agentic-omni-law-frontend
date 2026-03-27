import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";

interface DashboardQuickQueryCardProps {
  onSubmit: (query: string) => void;
  onUploadShortcut: () => void;
  hints: string[];
  uploadedFiles: string[];
  viewAllHref: string;
  submitting?: boolean;
}

export default function DashboardQuickQueryCard({
  onSubmit,
  onUploadShortcut,
  hints,
  uploadedFiles,
  viewAllHref,
  submitting = false,
}: DashboardQuickQueryCardProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const safeHints = hints.length > 0 ? hints : ["Ask a legal question to begin analysis."];
  const currentHint = useMemo(() => safeHints[hintIndex % safeHints.length], [hintIndex, safeHints]);
  const paused = focused || query.trim().length > 0;

  useEffect(() => {
    setHintIndex(0);
    setTypedCount(0);
  }, [safeHints]);

  useEffect(() => {
    if (paused) return;
    if (typedCount < currentHint.length) {
      const timer = window.setTimeout(() => setTypedCount((value) => value + 1), 34);
      return () => window.clearTimeout(timer);
    }
    const holdTimer = window.setTimeout(() => {
      setTypedCount(0);
      setHintIndex((value) => (value + 1) % safeHints.length);
    }, 1900);
    return () => window.clearTimeout(holdTimer);
  }, [currentHint, paused, safeHints.length, typedCount]);

  const submit = () => {
    const next = query.trim();
    if (!next || submitting) return;
    onSubmit(next);
  };

  const visibleFiles = uploadedFiles.slice(0, 2);
  const remaining = Math.max(0, uploadedFiles.length - visibleFiles.length);

  return (
    <Card className="p-4 md:p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="mb-3">
        <h2 className="text-lg md:text-xl font-bold font-heading">Quick Query</h2>
        <p className="text-sm text-muted-foreground">Type once to continue in Query Parsing with the same case workspace.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          aria-label="Quick Query Input"
          className="pl-10 pr-28 h-11 md:h-12"
        />
        {!query ? (
          <motion.span
            key={`${hintIndex}-${typedCount}`}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: paused ? 0 : 1 }}
            className="pointer-events-none absolute left-10 right-28 top-1/2 -translate-y-1/2 text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
            data-testid="quick-query-hint"
          >
            {currentHint.slice(0, typedCount)}
          </motion.span>
        ) : null}
        <Button
          type="button"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 md:h-9"
          onClick={submit}
          disabled={!query.trim() || submitting}
          aria-label="Submit Quick Query"
        >
          {submitting ? "Starting..." : "Analyze"}
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="h-8"
          onClick={onUploadShortcut}
          aria-label="Upload case files shortcut"
        >
          Upload case files
        </Button>
        <p className="text-xs text-muted-foreground">
          Upload-once workspace is reused across Query Parsing and all agents.
        </p>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {uploadedFiles.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            <span>Uploaded: {visibleFiles.join(", ")}</span>
            {remaining > 0 ? <span>+{remaining} more</span> : null}
            <Link href={viewAllHref}>
              <span className="text-primary hover:underline cursor-pointer">View all</span>
            </Link>
          </div>
        ) : (
          <p>No files uploaded yet. Upload to analyze documents.</p>
        )}
      </div>
    </Card>
  );
}

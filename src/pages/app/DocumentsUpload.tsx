import { useEffect, useRef, useState } from "react";
import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, Check, FolderOpen, Sparkles } from "lucide-react";
import { useAppStore } from "@/store";
import { useLocation } from "wouter";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { caseService } from "@/services/caseService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function DocumentsUpload() {
  const setCaseWorkspace = useAppStore((state) => state.setCaseWorkspace);
  const casesById = useAppStore((state) => state.casesById);
  const workspace = useAppStore((state) => state.caseWorkspace);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [mode, setMode] = useState<"ready" | "loading" | "error">("ready");
  const [documentType, setDocumentType] = useState<"contract" | "case_file" | "other">("contract");
  const [analysisOptions, setAnalysisOptions] = useState({
    riskAnalysis: true,
    complianceCheck: true,
    documentSummary: false,
  });
  const uploadAreaRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);
  const caseIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get("caseId");
    caseIdRef.current = caseId;
    if (caseId) {
      const title = casesById[caseId]?.title || "Uploaded Case Workspace";
      setCaseWorkspace(caseId, title);
    }
    if (params.get("focusUpload") === "1") {
      uploadAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [casesById, setCaseWorkspace]);

  const continueToQuery = async () => {
    const caseId = caseIdRef.current || workspace.caseId || await caseService.ensureCase("Uploaded Case Workspace");
    setLocation(`/app/agents/query?caseId=${encodeURIComponent(caseId)}&autostart=1`);
  };

  const uploadSelectedFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setMode("loading");
    try {
      const caseId = caseIdRef.current || workspace.caseId || await caseService.ensureCase("Uploaded Case Workspace");
      caseIdRef.current = caseId;
      const title = casesById[caseId]?.title || "Uploaded Case Workspace";
      setCaseWorkspace(caseId, title);
      const files = Array.from(list);
      await caseService.uploadFiles(caseId, files);
      setUploaded((prev) => [...prev, ...files.map((f) => f.name)]);
      setMode("ready");
      toast({ title: "Upload complete", description: `${files.length} file(s) added to ${caseId}.` });
    } catch (error) {
      setMode("error");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to upload files.",
        variant: "destructive",
      });
    }
  };

  const docTypes = [
    {
      key: "contract" as const,
      title: "Contract",
      description: "Legal agreements & contracts",
    },
    {
      key: "case_file" as const,
      title: "Case File",
      description: "Legal case documents",
    },
    {
      key: "other" as const,
      title: "Other",
      description: "Other legal documents",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-3xl font-bold font-heading">Upload Documents</h1>
          <p className="text-muted-foreground mt-1">
            Upload legal documents for AI analysis
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        {mode === "loading" ? (
          <LoadingState title="Uploading document" description="Uploading to backend case workspace." />
        ) : null}
        {mode === "error" ? (
          <ErrorState title="Upload failed" description="Retry upload and ensure backend is running." />
        ) : null}

        <Card ref={uploadAreaRef} className="p-6 md:p-8 border border-border/70 bg-card/80">
          <div
            className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 py-10 md:py-14 text-center cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium text-base">
              Drop your files here or <span className="text-primary underline underline-offset-4">browse</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Supports PDF, DOC, DOCX, TXT files up to 50MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => void uploadSelectedFiles(e.target.files)}
          />
          {uploaded.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {uploaded.slice(-5).map((name) => (
                <span key={name} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs">
                  <Check className="h-3 w-3" />
                  {name}
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Document Type</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {docTypes.map((type) => (
              <button
                key={type.key}
                type="button"
                onClick={() => setDocumentType(type.key)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  documentType === type.key
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/70 hover:bg-muted/30",
                )}
              >
                <p className="font-medium text-sm">{type.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </Card>
      </FadeIn>

      <FadeIn delay={0.25}>
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Analysis Options</h2>
          <div className="space-y-4">
            {[
              {
                key: "riskAnalysis" as const,
                title: "Risk Analysis",
                description: "Identify potential risks and vulnerabilities",
              },
              {
                key: "complianceCheck" as const,
                title: "Compliance Check",
                description: "Verify regulatory compliance",
              },
              {
                key: "documentSummary" as const,
                title: "Document Summary",
                description: "Generate concise summary",
              },
            ].map((option) => (
              <label key={option.key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border"
                  checked={analysisOptions[option.key]}
                  onChange={(e) =>
                    setAnalysisOptions((prev) => ({
                      ...prev,
                      [option.key]: e.target.checked,
                    }))
                  }
                />
                <div>
                  <p className="text-sm font-medium">{option.title}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>
      </FadeIn>

      <FadeIn delay={0.3}>
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold mb-3">Current Case Workspace</h2>
              <p className="text-sm text-muted-foreground">
                Files uploaded here stay attached to the same case and can be reused across agents.
              </p>
            </div>
            <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary md:flex">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          {workspace.caseId ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Using current case: <span className="font-mono text-primary">{workspace.caseId}</span>
              </p>
              <p>{workspace.uploadedDocuments.length} file(s) in workspace.</p>
              {workspace.uploadedDocuments.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {workspace.uploadedDocuments.slice(0, 6).map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      <Check className="h-3 w-3" />
                      {name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No active workspace yet"
              description="Upload your first case file and the app will create a reusable workspace automatically."
              icon={<FolderOpen className="h-6 w-6" />}
            />
          )}
          <div className="mt-5">
            <Button
              className="w-full h-11"
              onClick={() => void continueToQuery()}
              aria-label="Start analysis"
              disabled={mode === "loading"}
            >
              {mode === "loading" ? "Uploading..." : "Start Analysis"}
            </Button>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

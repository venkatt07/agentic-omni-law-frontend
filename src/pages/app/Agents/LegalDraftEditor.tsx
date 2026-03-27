import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Copy, Download, FileText, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { legalDraftsService, type DraftDetail } from "@/services/legalDraftsService";
import { apiClient } from "@/services/apiClient";
import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import AgentReportBackButton from "@/components/app/AgentReportBackButton";

type UiState = "loading" | "running" | "ready" | "error";

function getDraftReviewMessage(draft: DraftDetail | null) {
  if (!draft) return "Review the draft before final export.";
  if (draft.analysis_valid) return "";
  if (draft.mode === "fallback") {
    return "Review the draft carefully before final export. Some case-specific details still need confirmation from the workspace.";
  }
  return "Review the draft and validate the remaining case-specific details before final export.";
}

function getRunIdFromUrl() {
  const url = new URL(window.location.href);
  const runId = url.searchParams.get("runId");
  return runId && runId.trim() ? runId.trim() : null;
}

export default function LegalDraftEditor() {
  const [matched, params] = useRoute("/app/cases/:caseId/agents/legal-drafts/:templateKey/:draftId");
  const [, setLocation] = useLocation();
  const setCaseWorkspace = useAppStore((s) => s.setCaseWorkspace);

  const caseId = matched ? params.caseId : undefined;
  const draftId = matched ? params.draftId : undefined;
  const [runId, setRunId] = useState<string | null>(() => getRunIdFromUrl());

  const [state, setState] = useState<UiState>("loading");
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [editableContent, setEditableContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const groupedSuggestions = useMemo(() => {
    if (!draft) return { clauses: [], customizations: [] };
    const clauses = (draft.suggestions?.add_clauses || []).slice(0, 3);
    const customizations = (draft.suggestions?.customizations || [])
      .filter((item, idx, arr) => arr.findIndex((x) => x.section === item.section && x.issue === item.issue) === idx)
      .slice(0, 4);
    return { clauses, customizations };
  }, [draft]);

  const draftStats = useMemo(() => {
    const words = editableContent.trim() ? editableContent.trim().split(/\s+/).filter(Boolean).length : 0;
    return {
      words,
      citations: draft?.citations?.length || 0,
      questions: draft?.clarifying_questions?.length || 0,
    };
  }, [draft, editableContent]);

  async function loadDraft() {
    if (!caseId || !draftId) return;
    setError(null);
    setState((s) => (s === "running" ? s : "loading"));
    try {
      const d = await legalDraftsService.getDraft(caseId, draftId);
      if (runId && String(d.status || "").toLowerCase() === "running") {
        setDraft(d);
        setEditableContent(d.content || "");
        setState("running");
        return;
      }
      setDraft(d);
      setEditableContent(d.content || "");
      setState("ready");
    } catch (e) {
      if (runId) {
        setState("running");
        return;
      }
      setState("error");
      setError(e instanceof Error ? e.message : "Failed to load draft");
    }
  }

  useEffect(() => {
    if (!caseId || !draftId) return;
    void loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, draftId]);

  useEffect(() => {
    if (!caseId || !draft?.title) return;
    setCaseWorkspace(caseId, draft.title);
  }, [caseId, draft?.title, setCaseWorkspace]);

  useEffect(() => {
    if (!caseId || !runId) return;
    let cancelled = false;
    let timer: number | null = null;
    setState("running");
    const poll = async () => {
      try {
        const status = await legalDraftsService.getRunStatus(runId);
        if (cancelled) return;
        if (status.status === "SUCCEEDED") {
          setRunId(null);
          void loadDraft();
          return;
        }
        if (status.status === "FAILED") {
          try {
            if (!draftId) throw new Error("Draft generation failed");
            const d = await legalDraftsService.getDraft(caseId, draftId);
            if (cancelled) return;
            setDraft(d);
            setEditableContent(d.content || "");
            setState("ready");
            setRunId(null);
            return;
          } catch {
            setState("error");
            setError(status.error || status.error_message || "Draft generation failed");
            setRunId(null);
            return;
          }
        }
        void loadDraft();
        timer = window.setTimeout(poll, 900);
      } catch (e) {
        if (cancelled) return;
        setState("error");
        setError(e instanceof Error ? e.message : "Failed to poll draft generation");
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, runId]);

  const exportPdfUrl = useMemo(() => (caseId && draftId ? legalDraftsService.getExportPdfUrl(caseId, draftId) : ""), [caseId, draftId]);
  const downloadExportPdf = async () => {
    if (!exportPdfUrl) return;
    try {
      await apiClient.download(exportPdfUrl, { filename: `legal-draft-${draftId}.pdf` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      window.alert(message);
    }
  };

  if (!caseId || !draftId) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <EmptyState title="Draft not found" description="Open Legal Drafts and generate a draft first." actionLabel="Open Legal Drafts" onAction={() => setLocation("/app/agents/draft")} />
      </div>
    );
  }

  if (state === "loading" || state === "running") {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <LoadingState
          title={state === "running" ? "Generating draft..." : "Loading draft..."}
          description={state === "running" ? "Extracting facts, retrieving evidence, and preparing draft output." : "Loading draft content and validation details."}
        />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <ErrorState title="Draft generation failed" description={error || "Please retry from template gallery."} actionLabel="Back to Legal Drafts" onAction={() => setLocation(`/app/cases/${caseId}/agents/legal-drafts`)} />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <EmptyState title="No draft data" description="Generate a draft from the template gallery." actionLabel="Open Legal Drafts" onAction={() => setLocation(`/app/cases/${caseId}/agents/legal-drafts`)} />
      </div>
    );
  }

  return (
    <div className="p-6 pt-10 md:p-8 md:pt-14 max-w-7xl mx-auto space-y-6">
      <div className="space-y-4">
        <AgentReportBackButton fallbackHref={`/app/cases/${caseId}/agents/legal-drafts`} fallbackLabel="Back to Templates" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
          <h1 className="text-3xl font-bold font-heading">Legal Draft</h1>
          <p className="text-muted-foreground mt-1">{draft.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">Template: {draft.template_key}</Badge>
            <Badge variant={draft.analysis_valid ? "default" : "secondary"}>{draft.analysis_valid ? "Validated" : "Needs review"}</Badge>
          </div>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(editableContent || "");
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" onClick={() => void downloadExportPdf()}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            onClick={async () => {
              setSaving(true);
              try {
                const updated = await legalDraftsService.save(caseId, draftId, { content: editableContent });
                setDraft(updated);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Draft Size
          </div>
          <div className="mt-2 text-2xl font-semibold">{draftStats.words}</div>
          <div className="text-xs text-muted-foreground">Words in current draft</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            Evidence Support
          </div>
          <div className="mt-2 text-2xl font-semibold">{draftStats.citations}</div>
          <div className="text-xs text-muted-foreground">Grounding references attached</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium">Open Questions</div>
          <div className="mt-2 text-2xl font-semibold">{draftStats.questions}</div>
          <div className="text-xs text-muted-foreground">Inputs still needing confirmation</div>
        </Card>
      </div>

      {!draft.analysis_valid ? (
        <Card className="p-4 border-amber-500/40 bg-amber-500/10">
          <div className="font-medium">Draft needs review</div>
          <div className="text-sm text-muted-foreground">
            {getDraftReviewMessage(draft) || "Some required inputs may be missing. Check clarifying questions and evidence validation."}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card className="p-5">
          <div className="mb-3">
            <div className="text-sm font-medium">Draft Content</div>
            <div className="text-xs text-muted-foreground mt-1">Review and refine the case-grounded draft before export.</div>
          </div>
          <Textarea value={editableContent} onChange={(e) => setEditableContent(e.target.value)} className="min-h-[560px] text-sm leading-7" />
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Draft Guidance</h3>
            <div className="space-y-3">
              {groupedSuggestions.clauses.map((s) => (
                <div key={`${s.title}-${String(s.suggested_text || "").slice(0, 16)}`} className="rounded-md border p-2">
                  <div className="font-medium text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.why}</div>
                  <div className="text-xs mt-1">{s.suggested_text}</div>
                </div>
              ))}
              {groupedSuggestions.customizations.map((c) => (
                <div key={`${c.section}-${c.issue}`} className="rounded-md border p-2">
                  <div className="font-medium text-sm">{c.section}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.issue}</div>
                  <div className="text-xs mt-1">{c.fix}</div>
                </div>
              ))}
              {!groupedSuggestions.clauses.length && !groupedSuggestions.customizations.length ? (
                <div className="text-sm text-muted-foreground">No additional drafting guidance available for this output.</div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="validation">
        <TabsList>
          <TabsTrigger value="validation">Evidence / Validation</TabsTrigger>
          <TabsTrigger value="citations">Citations</TabsTrigger>
          <TabsTrigger value="questions">Clarifying Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="validation" className="space-y-2">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Overall Readiness: {draft.evidence_validation?.overall_readiness || "Needs Inputs"}</div>
            <div className="space-y-2">
              {(draft.evidence_validation?.required_items || []).map((i) => (
                <div key={i.item} className="rounded-md border p-2 text-sm flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{i.item}</div>
                    <div className="text-muted-foreground text-xs mt-1">{i.notes}</div>
                  </div>
                  <Badge variant={i.status === "present" ? "default" : i.status === "conflicting" ? "destructive" : "secondary"}>{i.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="citations">
          <Card className="p-4 space-y-2">
            {(draft.citations || []).map((c) => (
              <div key={`${c.ref}-${String(c.snippet || "").slice(0, 20)}`} className="rounded-md border p-2 text-xs">
                <div className="font-medium">{c.ref} - {c.source_type}</div>
                <div className="text-muted-foreground mt-1">{c.snippet}</div>
              </div>
            ))}
            {!draft.citations?.length ? <div className="text-sm text-muted-foreground">No citations available.</div> : null}
          </Card>
        </TabsContent>
        <TabsContent value="questions">
          <Card className="p-4">
            <div className="space-y-2">
              {(draft.clarifying_questions || []).map((q, idx) => (
                <div key={`${q}-${idx}`} className="rounded-md border p-2 text-sm">{q}</div>
              ))}
              {!draft.clarifying_questions?.length ? <div className="text-sm text-muted-foreground">No clarifying questions.</div> : null}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

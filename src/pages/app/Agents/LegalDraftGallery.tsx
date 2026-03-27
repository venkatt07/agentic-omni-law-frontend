import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useRef } from "react";
import { AlertTriangle, Download, Eye, FileText, Play, RefreshCw, Sparkles } from "lucide-react";
import { authService } from "@/services/authService";
import { caseService } from "@/services/caseService";
import { legalDraftsService, type DraftMeta, type DraftTemplate } from "@/services/legalDraftsService";
import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import AgentReportBackButton from "@/components/app/AgentReportBackButton";
import { canOpenSourceDocument, getSourceActionLabel, getSourceDisplayName, getSourceLeadLabel, hasPageCount, isPastedSource } from "@/lib/sourceDocument";
import { openAgentCase } from "@/lib/agentCaseNavigation";

type UiState = "loading" | "ready" | "error";
type CaseListItem = { case_id: string; title: string; domain: string; updated_at: string; last_run_status: string | null };

export default function LegalDraftGallery() {
  const [matchCaseRoute, params] = useRoute("/app/cases/:caseId/agents/legal-drafts");
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setActiveCaseId = useAppStore((s) => s.setActiveCaseId);
  const language = useAppStore((s) => s.language);
  const caseId = matchCaseRoute ? params.caseId : undefined;
  const [, setLocation] = useLocation();

  const [state, setState] = useState<UiState>("loading");
  const [meta, setMeta] = useState<DraftMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvingDefaultCase, setResolvingDefaultCase] = useState(false);

  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate | null>(null);
  const [jurisdiction, setJurisdiction] = useState("India");
  const [draftLanguage, setDraftLanguage] = useState(language || "English");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [startingRun, setStartingRun] = useState(false);
  const defaultCaseRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!casePickerOpen) return;
    setLoadingCases(true);
    caseService
      .listCases()
      .then((rows) => setCases(rows as any))
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false));
  }, [casePickerOpen]);

  useEffect(() => {
    if (matchCaseRoute) {
      defaultCaseRedirectRef.current = null;
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      let targetCaseId = activeCaseId || "";
      if (!targetCaseId) {
        try {
          const me = await authService.me();
          targetCaseId = (me as any)?.active_case_id || "";
          if (targetCaseId) setActiveCaseId(targetCaseId);
        } catch {}
      }
      if (!targetCaseId || cancelled) return;
      if (defaultCaseRedirectRef.current === targetCaseId) return;
      defaultCaseRedirectRef.current = targetCaseId;
      setResolvingDefaultCase(true);
      const title = useAppStore.getState().casesById[targetCaseId]?.title || "Current Case Workspace";
      try {
        await openAgentCase({
          agentKey: "legal_drafts_validation",
          caseId: targetCaseId,
          title,
          setLocation,
          replace: true,
        });
      } finally {
        if (!cancelled) setResolvingDefaultCase(false);
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [activeCaseId, matchCaseRoute, setActiveCaseId, setLocation]);

  async function loadMeta() {
    if (!caseId) return;
    setError(null);
    setState("loading");
    try {
      const data = await legalDraftsService.getMeta(caseId);
      setMeta(data);
      if (data.case?.title) useAppStore.getState().setCaseWorkspace(caseId, data.case.title);
      setState("ready");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Failed to load legal drafts");
    }
  }

  useEffect(() => {
    if (!caseId) return;
    void loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, DraftTemplate[]> = {};
    for (const t of meta?.templates || []) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    }
    return groups;
  }, [meta?.templates]);

  const recommendedTemplateKey = meta?.template_recommendation?.template_key || null;
  const isPastedInput = isPastedSource(meta?.primary_doc);
  const sourceTitle = getSourceDisplayName(meta?.primary_doc, "No case input available");
  const sourceLeadLabel = getSourceLeadLabel(meta?.primary_doc);
  const sourceActionLabel = getSourceActionLabel(meta?.primary_doc);
  const canOpenSource = canOpenSourceDocument(meta?.primary_doc);

  async function startGeneration() {
    if (!caseId || !selectedTemplate) return;
    setStartingRun(true);
    try {
      const res = await legalDraftsService.generate(caseId, {
        template_key: selectedTemplate.key,
        language: draftLanguage || "English",
        jurisdiction: jurisdiction || "India",
        extra_instructions: extraInstructions.trim() || undefined,
      });
      setTemplateDialogOpen(false);
      const editorHref = `/app/cases/${caseId}/agents/legal-drafts/${selectedTemplate.key}/${encodeURIComponent(res.draft_id)}${res.run_id ? `?runId=${encodeURIComponent(res.run_id)}` : ""}`;
      if (typeof window !== "undefined") {
        window.location.assign(editorHref);
        return;
      }
      setLocation(editorHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate draft");
      setState("error");
    } finally {
      setStartingRun(false);
    }
  }

  if (!caseId) {
    if (resolvingDefaultCase) {
      return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          <LoadingState title="Opening Legal Drafts" description="Loading selected case..." />
        </div>
      );
    }
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <EmptyState
          title="No case selected"
          description="Open a case in Query Parsing first to generate drafts."
          actionLabel="Open Query Parsing"
          onAction={() => setLocation("/app/agents/query")}
        />
      </div>
    );
  }

  if (state === "loading") {
    return <div className="p-6 md:p-8 max-w-7xl mx-auto"><LoadingState title="Loading draft templates" description="Reading case workspace and templates." /></div>;
  }

  if (state === "error") {
    return <div className="p-6 md:p-8 max-w-7xl mx-auto"><ErrorState title="Legal draft generator unavailable" description={error || "Please retry."} actionLabel="Retry" onAction={() => void loadMeta()} /></div>;
  }

  return (
    <div className="p-6 pt-10 md:p-8 md:pt-14 max-w-7xl mx-auto space-y-6">
      <Dialog open={casePickerOpen} onOpenChange={setCasePickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Switch Case</DialogTitle>
            <DialogDescription>Select a case to open Legal Drafts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {loadingCases ? <div className="text-sm text-muted-foreground">Loading case history...</div> : null}
            {!loadingCases && !cases.length ? <div className="text-sm text-muted-foreground">No cases found.</div> : null}
            {cases.map((row) => (
              <button
                key={row.case_id}
                type="button"
                onClick={() => {
                  setCasePickerOpen(false);
                  void openAgentCase({
                    agentKey: "legal_drafts_validation",
                    caseId: row.case_id,
                    title: row.title,
                    setLocation,
                  });
                }}
                className="w-full text-left rounded-md border p-3 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.domain}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleString()}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.title || "Generate Draft"}</DialogTitle>
            <DialogDescription>Confirm draft settings before generation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTemplate?.fit?.caution ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Template caution
                </div>
                <div className="mt-1 text-muted-foreground">{selectedTemplate.fit.caution}</div>
              </div>
            ) : null}
            <div>
              <label className="text-sm text-muted-foreground">Jurisdiction</label>
              <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Language</label>
              <Input value={draftLanguage} onChange={(e) => setDraftLanguage(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Extra instructions (optional)</label>
              <Textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void startGeneration()} disabled={startingRun || !selectedTemplate}>
              {startingRun ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Generate Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <AgentReportBackButton fallbackHref={`/app/cases/${caseId}/agents/query-parsing`} fallbackLabel="Back to Query Parsing" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
          <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">Agent Analysis</div>
          <h1 className="text-3xl font-bold font-heading">Legal Draft Generator</h1>
          <p className="text-muted-foreground mt-1">Templates + evidence/document validation</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">Case: {meta?.case?.title || "Selected Case"}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setCasePickerOpen(true)}>Switch Case</Button>
          </div>
        </div>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">{sourceLeadLabel}</p>
            <h2 className="font-semibold text-lg">{sourceTitle}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {meta?.primary_doc?.mime_type ? <Badge variant="outline">{meta.primary_doc.mime_type}</Badge> : null}
              {isPastedInput ? <Badge variant="outline">Text Query</Badge> : null}
              {hasPageCount(meta?.primary_doc) ? <Badge variant="outline">{meta?.primary_doc?.pages} pages</Badge> : null}
              {meta?.primary_doc?.updated_at ? <Badge variant="outline">Updated {new Date(meta.primary_doc.updated_at).toLocaleString()}</Badge> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canOpenSource ? (
              <Button variant="outline" onClick={() => setLocation(`/app/cases/${caseId}/documents/${meta?.primary_doc?.doc_id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                {sourceActionLabel}
              </Button>
            ) : null}
          </div>
        </div>
        {meta?.template_recommendation ? (
          <div className="mt-4 rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Recommended template
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge>{meta.templates.find((t) => t.key === meta.template_recommendation?.template_key)?.title || meta.template_recommendation.template_key}</Badge>
              <Badge variant="outline">{meta.template_recommendation.confidence} confidence</Badge>
              <Badge variant="outline">Fit {meta.template_recommendation.score}/100</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{meta.template_recommendation.reason}</p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-3">Popular Templates</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {(groupedTemplates["Popular Templates"] || []).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(t);
                    setJurisdiction(t.jurisdiction_default || "India");
                    setDraftLanguage(meta?.case?.language || language || "English");
                    setExtraInstructions("");
                    setTemplateDialogOpen(true);
                  }}
                  className={`rounded-md border p-4 text-left hover:border-primary transition-colors ${recommendedTemplateKey === t.key ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">{t.title}</div>
                    {recommendedTemplateKey === t.key ? <Badge>Recommended</Badge> : null}
                    {t.fit?.confidence ? <Badge variant="outline">{t.fit.confidence}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                  {t.fit?.reason ? <p className="text-xs text-muted-foreground mt-2">{t.fit.reason}</p> : null}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-3">All Templates</h2>
            <div className="space-y-4">
              {Object.entries(groupedTemplates).map(([category, list]) => (
                <div key={category}>
                  <div className="text-sm font-medium mb-2">{category}</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {list.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(t);
                          setJurisdiction(t.jurisdiction_default || "India");
                          setDraftLanguage(meta?.case?.language || language || "English");
                          setExtraInstructions("");
                          setTemplateDialogOpen(true);
                        }}
                        className={`rounded-md border p-3 text-left hover:border-primary transition-colors ${recommendedTemplateKey === t.key ? "border-primary bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium">{t.title}</div>
                          {recommendedTemplateKey === t.key ? <Badge>Recommended</Badge> : null}
                          {typeof t.fit?.score === "number" ? <Badge variant="outline">Fit {t.fit.score}</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{t.required.join(" • ")}</div>
                        {t.fit?.caution ? <div className="text-xs text-amber-600 mt-2">{t.fit.caution}</div> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">AI-Powered Drafting</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>Uses the selected case workspace evidence and facts.</li>
              <li>Adds clarifying questions when key facts are missing.</li>
              <li>Includes evidence validation checklist with citations.</li>
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Recent Drafts</h3>
            <div className="space-y-2">
              {(meta?.recent_drafts || []).map((d) => (
                <button
                  key={d.draft_id}
                  type="button"
                  onClick={() => setLocation(`/app/cases/${caseId}/agents/legal-drafts/${d.template_key}/${d.draft_id}`)}
                  className="w-full rounded-md border p-2 text-left hover:border-primary transition-colors"
                >
                  <div className="font-medium text-sm">{d.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                    <span>{d.analysis_valid ? "Validated" : "Needs review"}</span>
                    <span>{new Date(d.updated_at).toLocaleString()}</span>
                  </div>
                </button>
              ))}
              {!meta?.recent_drafts?.length ? <div className="text-sm text-muted-foreground">No drafts yet.</div> : null}
            </div>
            {!!meta?.recent_drafts?.length ? (
              <a
                href={legalDraftsService.getExportPdfUrl(caseId, meta.recent_drafts[0].draft_id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-3"
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Latest PDF
                </Button>
              </a>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, FolderOpen, RefreshCw, Upload } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ClickableCard from "@/components/app/ClickableCard";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store";
import { caseService } from "@/services/caseService";
import { useEffect } from "react";
import { apiClient } from "@/services/apiClient";

type MyDoc = {
  id: string;
  name: string;
  size: string;
  date: string;
  createdAt?: string;
  caseId?: string;
  type: "uploaded";
  mimeType?: string;
};

type DocPreviewPayload = {
  doc_id: string;
  name: string;
  mime_type: string;
  extracted_text?: string;
  extracted_text_exists?: boolean;
};

type CaseDocumentsPayload = {
  case_id: string;
  documents: Array<{
    doc_id: string;
    name: string;
    type: string;
    size: number;
    created_at: string;
  }>;
};

export default function DocumentsMy() {
  const [, setLocation] = useLocation();
  const [docRouteMatch, docRouteParams] = useRoute<{ caseId: string; docId: string }>("/app/cases/:caseId/documents/:docId");
  const { toast } = useToast();
  const { t } = useI18n();
  const casesById = useAppStore((state) => state.casesById);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<MyDoc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>("");
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [queryCaseId, setQueryCaseId] = useState<string | null>(null);
  const [apiDocs, setApiDocs] = useState<MyDoc[] | null>(null);
  const [catalogMode, setCatalogMode] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = docRouteMatch
      ? String(docRouteParams?.caseId || "")
      : new URLSearchParams(window.location.search).get("caseId");
    setQueryCaseId(id);
    if (id) {
      void caseService.fetchCase(id).catch(() => undefined);
    }
  }, []);
  const loadDocs = async () => {
    try {
      setCatalogMode("loading");
      const cases = await apiClient.get<Array<{ case_id: string; title: string }>>("/cases");
      const docsCollected: MyDoc[] = [];
      for (const row of cases || []) {
        const details = await apiClient.get<{
          case_id: string;
          documents: Array<{ doc_id: string; name: string; type: string; size: number; created_at: string }>;
        }>(`/cases/${encodeURIComponent(row.case_id)}`);
        for (const d of details.documents || []) {
          const n = String(d.name || "").trim().toLowerCase();
          if (!n || n === "query-context" || n === "query input" || n === "pasted text") continue;
          docsCollected.push({
            id: d.doc_id,
            name: d.name,
            size: `${(Number(d.size || 0) / (1024 * 1024)).toFixed(1)} MB`,
            date: new Date(d.created_at).toLocaleString(),
            createdAt: d.created_at,
            caseId: details.case_id,
            type: "uploaded",
            mimeType: String(d.type || "").toLowerCase(),
          });
        }
      }
      docsCollected.sort((a, b) => {
        const ta = new Date(String(a.createdAt || 0)).getTime();
        const tb = new Date(String(b.createdAt || 0)).getTime();
        return tb - ta;
      });
      setApiDocs(docsCollected);
      setCatalogMode("ready");
    } catch {
      setApiDocs(null);
      setCatalogMode("error");
    }
  };
  useEffect(() => {
    void loadDocs();
  }, []);
  const docs = useMemo(() => {
    if (apiDocs) {
      const filtered = queryCaseId ? apiDocs.filter((doc) => doc.caseId === queryCaseId) : apiDocs;
      const seen = new Set<string>();
      const unique: MyDoc[] = [];
      for (const doc of filtered) {
        const key = `${doc.caseId || "none"}::${doc.name}::${doc.createdAt || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(doc);
      }
      return unique;
    }
    const fromCases: MyDoc[] = Object.values(casesById).flatMap((item) =>
      (item.uploadedDocuments || []).map((name, index) => ({
        id: `case-${item.caseId}-${index}`,
        name,
        size: "0.9 MB",
        date: item.lastUpdated || t("documentsMy.recently"),
        createdAt: item.lastUpdated || undefined,
        caseId: item.caseId,
        type: "uploaded",
        mimeType: "",
      })),
    );
    const merged = [...fromCases];
    const unique: MyDoc[] = [];
    const seen = new Set<string>();
    for (const doc of merged) {
      const key = `${doc.caseId || "none"}::${doc.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(doc);
    }
    if (queryCaseId) {
      return unique.filter((doc) => doc.caseId === queryCaseId);
    }
    return unique;
  }, [casesById, queryCaseId]);
  const totalCasesRepresented = useMemo(
    () => new Set(docs.map((doc) => doc.caseId).filter(Boolean)).size,
    [docs],
  );
  const latestUploadLabel = docs[0]?.date || t("documentsMy.noUploadsYet");

  useEffect(() => {
    if (!docRouteMatch) return;
    const routeCaseId = String(docRouteParams?.caseId || "");
    const routeDocId = String(docRouteParams?.docId || "");
    if (!routeCaseId || !routeDocId || !docs.length) return;
    const target = docs.find((d) => d.caseId === routeCaseId && d.id === routeDocId);
    if (!target) return;
    if (activeDoc?.id === target.id && previewOpen) return;
    void openPreview(target);
  }, [docRouteMatch, docRouteParams?.caseId, docRouteParams?.docId, docs, previewOpen, activeDoc?.id]);

  const mergeResolvedDoc = (current: MyDoc, resolved: MyDoc) => {
    setApiDocs((prev) => {
      if (!prev?.length) return prev;
      return prev.map((item) => {
        if (item.id !== current.id) return item;
        return { ...item, ...resolved };
      });
    });
  };

  const resolveCanonicalDoc = async (doc: MyDoc): Promise<MyDoc> => {
    if (!doc.caseId) return doc;
    try {
      const details = await apiClient.get<CaseDocumentsPayload>(`/cases/${encodeURIComponent(doc.caseId)}`);
      const caseDocs = [...(details.documents || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const direct = caseDocs.find((item) => item.doc_id === doc.id);
      const byName = caseDocs.find((item) => item.name === doc.name);
      const match = direct || byName;
      if (!match) return doc;
      const resolved: MyDoc = {
        ...doc,
        id: match.doc_id,
        name: match.name,
        mimeType: String(match.type || "").toLowerCase(),
        size: `${(Number(match.size || 0) / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date(match.created_at).toLocaleString(),
        createdAt: match.created_at,
      };
      if (resolved.id !== doc.id || resolved.createdAt !== doc.createdAt || resolved.size !== doc.size) {
        mergeResolvedDoc(doc, resolved);
      }
      return resolved;
    } catch {
      return doc;
    }
  };

  const openPreview = async (doc: MyDoc) => {
    if (!doc.caseId) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewText("");
    if (previewBlobUrl) {
      apiClient.revokeBlobUrl(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    const resolvedDoc = await resolveCanonicalDoc(doc);
    setActiveDoc(resolvedDoc);
    setPreviewOpen(true);
    try {
      const meta = await apiClient.get<DocPreviewPayload>(
        `/cases/${encodeURIComponent(resolvedDoc.caseId || doc.caseId)}/documents/${encodeURIComponent(resolvedDoc.id)}/text`,
      );
      const mime = String(meta.mime_type || resolvedDoc.mimeType || "").toLowerCase();
      setPreviewMime(mime);
      if (mime.includes("pdf")) {
        const url = await apiClient.getBlobUrl(
          `/cases/${encodeURIComponent(resolvedDoc.caseId || doc.caseId)}/documents/${encodeURIComponent(resolvedDoc.id)}/inline`,
        );
        setPreviewBlobUrl(url);
      } else {
        setPreviewText(String(meta.extracted_text || "").trim());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preview unavailable.";
      if (/document not found/i.test(message)) {
        void loadDocs();
      }
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadDocument = async (doc: MyDoc) => {
    if (!doc.caseId) return;
    const resolvedDoc = await resolveCanonicalDoc(doc);
    await apiClient.download(
      `/cases/${encodeURIComponent(resolvedDoc.caseId || doc.caseId)}/documents/${encodeURIComponent(resolvedDoc.id)}/download`,
      { filename: resolvedDoc.name || doc.name || "document" },
    );
    toast({
      title: t("documentsMy.downloadStarted"),
      description: t("documentsMy.downloadDescription", { name: resolvedDoc.name || doc.name }),
    });
  };

  useEffect(() => {
    return () => {
      if (previewBlobUrl) apiClient.revokeBlobUrl(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold font-heading">{t("documentsMy.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("documentsMy.subtitle")}
            </p>
            {queryCaseId ? (
              <p className="mt-2 text-sm text-primary">
                {t("documentsMy.showingCase", { caseId: queryCaseId })} <span className="font-mono">{queryCaseId}</span>
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void loadDocs()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("documentsMy.refresh")}
            </Button>
            <Button onClick={() => setLocation(queryCaseId ? `/app/documents/upload?caseId=${encodeURIComponent(queryCaseId)}` : "/app/documents/upload")}>
              <Upload className="mr-2 h-4 w-4" />
              {t("documentsMy.uploadDocuments")}
            </Button>
          </div>
        </div>
      </FadeIn>

      {catalogMode === "ready" ? (
        <FadeIn delay={0.05}>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4 rounded-[1.3rem]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("documentsMy.totalDocuments")}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{docs.length}</div>
            </Card>
            <Card className="p-4 rounded-[1.3rem]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("documentsMy.caseWorkspaces")}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{totalCasesRepresented}</div>
            </Card>
            <Card className="p-4 rounded-[1.3rem]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("documentsMy.latestUpload")}</div>
              <div className="mt-2 text-sm font-medium leading-6 text-foreground">{latestUploadLabel}</div>
            </Card>
          </div>
        </FadeIn>
      ) : null}

      {catalogMode === "loading" ? <LoadingState title={t("documentsMy.loadingTitle")} description={t("documentsMy.loadingDescription")} /> : null}
      {catalogMode === "error" ? (
        <ErrorState
          title={t("documentsMy.errorTitle")}
          description={t("documentsMy.errorDescription")}
          actionLabel={t("documentsMy.errorAction")}
          onAction={() => setLocation("/app/documents/upload")}
        />
      ) : null}

      {catalogMode === "ready" ? (
        <FadeIn delay={0.1}>
          {docs.length ? (
            <div className="space-y-3">
              {docs.map((doc) => (
                <ClickableCard
                  key={doc.id}
                  ariaLabel={t("documentsMy.openPreviewAria", { name: doc.name })}
                  onClick={() => openPreview(doc)}
                  className="p-4 flex items-center justify-between rounded-[1.3rem]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground leading-5">
                        {doc.size} | {doc.date} {doc.caseId ? `| ${doc.caseId}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("documentsMy.downloadAria", { name: doc.name })}
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadDocument(doc);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("documentsMy.previewAria", { name: doc.name })}
                      onClick={(event) => {
                        event.stopPropagation();
                        openPreview(doc);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </ClickableCard>
              ))}
            </div>
          ) : (
            <EmptyState
              title={queryCaseId ? t("documentsMy.emptyTitleCase") : t("documentsMy.emptyTitleAll")}
              description={
                queryCaseId
                  ? t("documentsMy.emptyDescriptionCase")
                  : t("documentsMy.emptyDescriptionAll")
              }
              actionLabel={t("documentsMy.uploadDocuments")}
              onAction={() => setLocation(queryCaseId ? `/app/documents/upload?caseId=${encodeURIComponent(queryCaseId)}` : "/app/documents/upload")}
              icon={<FolderOpen className="h-6 w-6" />}
            />
          )}
        </FadeIn>
      ) : null}

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open && previewBlobUrl) {
            apiClient.revokeBlobUrl(previewBlobUrl);
            setPreviewBlobUrl(null);
          }
          setPreviewOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeDoc?.name || t("documentsMy.previewTitle")}</DialogTitle>
            <DialogDescription>
              {t("documentsMy.previewMeta", {
                size: activeDoc?.size || "",
                date: activeDoc?.date || "",
                caseId: activeDoc?.caseId || t("documentsMy.previewUnassigned"),
              })}
            </DialogDescription>
          </DialogHeader>
          <Card className="p-4 text-sm text-muted-foreground max-h-[64vh] overflow-auto">
            {previewLoading ? (
              <div>{t("documentsMy.previewLoading")}</div>
            ) : previewError ? (
              <div className="text-destructive">{previewError}</div>
            ) : previewMime?.includes("pdf") && previewBlobUrl ? (
              <iframe
                src={previewBlobUrl}
                title={activeDoc?.name || "Document preview"}
                className="h-[60vh] w-full rounded-md border"
              />
            ) : previewText ? (
              <pre className="whitespace-pre-wrap break-words text-xs leading-6">{previewText}</pre>
            ) : (
              <div>{t("documentsMy.previewNoText")}</div>
            )}
          </Card>
          <div className="flex justify-end">
            {activeDoc ? (
              <Button onClick={() => void downloadDocument(activeDoc)} aria-label={t("documentsMy.downloadFile")}>
                {t("documentsMy.download")}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SourceDoc = {
  filename?: string | null;
  kind?: string | null;
  doc_id?: string | null;
  source_hint?: string | null;
  pages?: number | null;
};

function normalizeName(value: string | null | undefined) {
  return String(value || "").trim();
}

export function isPastedSource(doc: SourceDoc | null | undefined) {
  const kind = String(doc?.kind || "").toLowerCase();
  const name = normalizeName(doc?.filename).toLowerCase();
  return kind === "pasted_text" || ["query-context", "query input", "pasted text"].includes(name);
}

export function getSourceDisplayName(
  doc: SourceDoc | null | undefined,
  fallback = "No source input available",
) {
  const name = normalizeName(doc?.filename);
  if (!name) return fallback;
  return isPastedSource(doc) ? "Pasted Text" : name;
}

export function getSourceLeadLabel(doc: SourceDoc | null | undefined) {
  return isPastedSource(doc)
    ? "Using case input from Query Parsing"
    : "Using document from Query Parsing";
}

export function getSourceActionLabel(doc: SourceDoc | null | undefined) {
  return isPastedSource(doc) ? "View Input" : "View Document";
}

export function canOpenSourceDocument(doc: SourceDoc | null | undefined) {
  return !isPastedSource(doc) && !!String(doc?.doc_id || "").trim();
}

export function getSourceDescriptorLabel(doc: SourceDoc | null | undefined) {
  return isPastedSource(doc) ? "Input source" : "Document source";
}

export function getSourceHintLabel(doc: SourceDoc | null | undefined) {
  if (doc?.source_hint) return String(doc.source_hint);
  return isPastedSource(doc) ? "Query Parsing workspace input" : "Query Parsing source document";
}

export function hasPageCount(doc: SourceDoc | null | undefined) {
  return !isPastedSource(doc) && typeof doc?.pages === "number" && doc.pages > 0;
}

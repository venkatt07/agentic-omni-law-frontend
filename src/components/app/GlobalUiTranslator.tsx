import { useEffect, useRef } from "react";
import { useAppStore } from "@/store";
import { autoTranslateUiText } from "@/lib/i18n";

type TextSnapshot = {
  original: string;
  translated: string;
};

type AttributeSnapshot = Record<string, TextSnapshot>;

const TEXT_SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label"];

function shouldSkipTextNode(node: Text) {
  let parent = node.parentElement;
  while (parent) {
    if (TEXT_SKIP_TAGS.has(parent.tagName)) return true;
    if (parent instanceof HTMLElement) {
      if (parent.dataset.translationSkip !== undefined) return true;
      if (parent.isContentEditable) return true;
    }
    if (parent.tagName === "TEXTAREA") return true;
    if (parent.tagName === "INPUT" && parent.getAttribute("type") !== "button" && parent.getAttribute("type") !== "submit") return true;
    parent = parent.parentElement;
  }
  return false;
}

function shouldTranslateAttribute(element: Element, attributeName: string) {
  if (TEXT_SKIP_TAGS.has(element.tagName)) return false;
  if (element instanceof HTMLElement && element.dataset.translationSkip !== undefined) return false;
  if (element.tagName === "TEXTAREA" && attributeName !== "placeholder") return false;
  return true;
}

export default function GlobalUiTranslator() {
  const language = useAppStore((state) => state.language);
  const textSnapshotsRef = useRef(new WeakMap<Text, TextSnapshot>());
  const attributeSnapshotsRef = useRef(new WeakMap<Element, AttributeSnapshot>());

  useEffect(() => {
    if (typeof document === "undefined") return;

    const textSnapshots = textSnapshotsRef.current;
    const attributeSnapshots = attributeSnapshotsRef.current;

    const translateTextNode = (node: Text) => {
      if (shouldSkipTextNode(node)) return;
      const current = node.textContent ?? "";
      if (!current.trim()) return;
      const existing = textSnapshots.get(node);
      const original = !existing || current !== existing.translated ? current : existing.original;
      const translated = autoTranslateUiText(original, language);
      textSnapshots.set(node, { original, translated });
      if (current !== translated) node.textContent = translated;
    };

    const translateAttributes = (element: Element) => {
      const existing = attributeSnapshots.get(element) || {};
      for (const name of TRANSLATABLE_ATTRIBUTES) {
        if (!element.hasAttribute(name) || !shouldTranslateAttribute(element, name)) continue;
        const current = element.getAttribute(name) || "";
        if (!current.trim()) continue;
        const snapshot = existing[name];
        const original = !snapshot || current !== snapshot.translated ? current : snapshot.original;
        const translated = autoTranslateUiText(original, language);
        existing[name] = { original, translated };
        if (current !== translated) element.setAttribute(name, translated);
      }
      if (Object.keys(existing).length > 0) attributeSnapshots.set(element, existing);
    };

    const translateSubtree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text);
        return;
      }
      if (!(root instanceof Element) && !(root instanceof DocumentFragment) && !(root instanceof Document)) return;
      if (root instanceof Element) translateAttributes(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let currentNode: Node | null = walker.currentNode;
      while (currentNode) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
          translateTextNode(currentNode as Text);
        } else if (currentNode instanceof Element) {
          translateAttributes(currentNode);
        }
        currentNode = walker.nextNode();
      }
    };

    translateSubtree(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData" && record.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(record.target as Text);
          continue;
        }
        if (record.type === "attributes" && record.target instanceof Element) {
          translateAttributes(record.target);
          continue;
        }
        record.addedNodes.forEach((node) => translateSubtree(node));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}

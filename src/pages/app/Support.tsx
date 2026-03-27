import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/lib/magic-ui";
import { Send, Bot, User } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { useEffect, useMemo, useRef, useState } from "react";
import { chatService } from "@/services/chatService";
import { useAppStore } from "@/store";
import { useLocation } from "wouter";

type Msg = { id: string; role: "bot" | "user"; text: string; streaming?: boolean };

export default function Support() {
  const CHAT_MEMORY_KEY = "aol_help_chat_v1";
  const [mode] = useState<"ready" | "loading" | "empty" | "error">("ready");
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const casesById = useAppStore((state) => state.casesById);
  const language = useAppStore((state) => state.language);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const currentCase = activeCaseId ? casesById[activeCaseId] : undefined;
  const currentCaseTitle = String(currentCase?.title || "").trim();
  const [suggestions, setSuggestions] = useState<string[]>(
    currentCaseTitle
      ? ["Open Query Parsing", "Explain latest report", `Open ${currentCaseTitle}`, "Show case summary"]
      : ["Upload / Paste case", "Open an existing case"],
  );
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_MEMORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed
            .filter((m) => m && (m.role === "bot" || m.role === "user") && typeof m.text === "string")
            .slice(-30);
        }
      }
    } catch {
      // ignore
    }
    return [
      { id: "b1", role: "bot", text: "Hi! How can I help?\n[Upload / Paste case]\n[Open an existing case]\nWhat do you want to do?" },
    ];
  });

  const recentMessages = useMemo(
    () =>
      messages
        .slice(-10)
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text })),
    [messages],
  );

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    setSuggestions((prev) => (
      prev.length <= 2 && prev.every((item) => item === "Upload / Paste case" || item === "Open an existing case")
        ? (currentCaseTitle
            ? ["Open Query Parsing", "Explain latest report", `Open ${currentCaseTitle}`, "Show case summary"]
            : ["Upload / Paste case", "Open an existing case"])
        : prev
    ));
  }, [currentCaseTitle]);

  const handleQuickReply = (label: string) => {
    if (label === "Upload / Paste case") return setLocation("/app/documents/upload");
    if (label === "Open an existing case") return setLocation("/app/cases");
    setMessage(label);
  };

  const sendMessage = async (override?: string) => {
    const value = (override ?? message).trim();
    if (!value || sending) return;
    const nextRecentMessages = [
      ...recentMessages,
      { role: "user", text: value },
    ].slice(-10);
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text: value };
    const botId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [...prev, userMsg, { id: botId, role: "bot", text: "", streaming: true }]);
    setMessage("");
    setSending(true);
    requestAnimationFrame(() => inputRef.current?.focus());
    try {
      const reply = await chatService.send({
        case_id: activeCaseId || undefined,
        message: value,
        language,
        mode: "support_fast",
        recent_messages: nextRecentMessages,
      });
      setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text: reply.reply, streaming: false } : m)));
      if (Array.isArray(reply.suggestions) && reply.suggestions.length) {
        setSuggestions(reply.suggestions.map((s) => String(s)));
      }
    } catch (sendError) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? {
                ...m,
                text: sendError instanceof Error ? sendError.message : "Support is unavailable right now.",
                streaming: false,
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-4 md:p-6">
      {mode === "loading" ? <LoadingState title="Loading support chat" description="Connecting to chatbot module." /> : null}
      {mode === "empty" ? <EmptyState title="No chat history" description="Start a new support conversation." /> : null}
      {mode === "error" ? <ErrorState title="Support unavailable" description="Chatbot module failed to initialize." /> : null}

      {mode !== "ready" ? null : (
        <>
          <FadeIn className="shrink-0 mb-4">
            <h1 className="text-2xl font-bold font-heading">Help & Support</h1>
            <p className="text-sm text-muted-foreground">Case workflow assistant for modules, documents, reports, and next-step guidance.</p>
          </FadeIn>

          <FadeIn delay={0.1} className="flex-1 min-h-0">
            <Card className="h-full flex flex-col border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,249,252,0.95))] shadow-[0_28px_80px_-54px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(7,14,28,0.96),rgba(8,16,30,0.98))]">
              <div className="px-4 pt-4 flex flex-wrap gap-2 border-b pb-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-slate-200/80 bg-white/72 px-3 py-1 text-xs transition-colors hover:border-sky-400/35 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-sky-400/30 dark:hover:bg-sky-400/10"
                    onClick={() => handleQuickReply(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((item) => (
                  <div key={item.id} className={`flex gap-4 ${item.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${item.role === "user" ? "border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.06]" : "bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] text-white"}`}>
                      {item.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-white" />}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${item.role === "user" ? "rounded-tr-none bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] text-white shadow-[0_18px_40px_-26px_rgba(37,99,235,0.62)]" : "rounded-tl-none border border-slate-200/80 bg-white/86 text-slate-800 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-white/[0.05] dark:text-slate-100"}`}>
                      <p className="text-sm whitespace-pre-wrap">{item.text}{item.streaming ? <span className="animate-pulse">...</span> : null}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t bg-background mt-auto shrink-0">
                <form
                  className="relative flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                  }}
                >
                  <Input
                    ref={inputRef}
                    className="pr-12 h-12 rounded-full border-slate-200/80 bg-white/86 focus-visible:ring-1 focus-visible:bg-white dark:border-white/10 dark:bg-white/[0.04]"
                    placeholder="Ask about this case, a report, or the next module..."
                    aria-label="Message support"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  <Button size="icon" className="absolute right-1 h-10 w-10 rounded-full bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] shadow-[0_18px_38px_-22px_rgba(37,99,235,0.62)]" type="submit" aria-label="Send message" disabled={sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </FadeIn>
        </>
      )}
    </div>
  );
}


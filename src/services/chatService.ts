import { apiClient } from "./apiClient";
import { useAppStore } from "@/store";

export const chatService = {
  send(payload: { case_id?: string; message: string; language?: string; mode?: "support_fast" | "default"; recent_messages?: Array<{ role: string; text: string }> }) {
    return apiClient.post<{ reply: string; language: string; citations?: unknown[]; suggestions?: string[] }>("/chat", payload);
  },
  async stream(
    payload: { case_id?: string; message: string; language?: string; mode?: "support_fast" | "default"; recent_messages?: Array<{ role: string; text: string }> },
    handlers: {
      onToken: (token: string) => void;
      onTyping?: () => void;
      onDone?: (meta: { language?: string; citations?: unknown[]; suggestions?: string[]; reply?: string }) => void;
      onError?: (message: string) => void;
    },
  ) {
    const token = useAppStore.getState().authToken;
    const res = await fetch(`${apiClient.baseUrl}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Chat stream failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const evt of events) {
        const line = evt.split(/\r?\n/).find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.event === "typing") handlers.onTyping?.();
          if (payload.chunk) handlers.onToken(String(payload.chunk));
          if (payload.event === "done" || payload.done) {
            handlers.onDone?.({
              language: payload.language,
              citations: payload.citations,
              suggestions: payload.suggestions,
              reply: payload.reply,
            });
          }
          if (payload.event === "error") handlers.onError?.("I could not complete that right now. Please try again.");
        } catch {
          // ignore malformed chunks
        }
      }
    }
  },
};

import { useCallback } from "react";
import { useAppStore } from "@/store";
import { translate } from "@/lib/i18n";

export function useI18n() {
  const language = useAppStore((state) => state.language);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );

  return { language, t };
}

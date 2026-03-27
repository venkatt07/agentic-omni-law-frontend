import { useState } from "react";
import { useAppStore } from "@/store";
import { userPreferencesService } from "@/services/userPreferencesService";
import { getLanguageOption, isSupportedLanguage, type SupportedLanguage } from "@/lib/languages";

export function useLanguagePreference() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLanguage = isSupportedLanguage(language) ? language : "English";

  const updateLanguage = async (nextLanguage: SupportedLanguage) => {
    if (nextLanguage === selectedLanguage) return nextLanguage;
    const previousLanguage = selectedLanguage;
    setLanguage(nextLanguage);
    setSaving(true);
    setError(null);
    try {
      const result = await userPreferencesService.update(nextLanguage);
      const resolved = isSupportedLanguage(result.language) ? result.language : nextLanguage;
      setLanguage(resolved);
      return resolved;
    } catch (err) {
      setLanguage(previousLanguage);
      setError(err instanceof Error ? err.message : "Unable to update language preference.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    language: selectedLanguage,
    languageOption: getLanguageOption(selectedLanguage),
    saving,
    error,
    clearLanguageError: () => setError(null),
    updateLanguage,
  };
}

export type SupportedLanguage = "English" | "Hindi" | "Tamil" | "Bengali";

export type LanguageOption = {
  value: SupportedLanguage;
  label: string;
  nativeLabel: string;
  description: string;
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    value: "English",
    label: "English",
    nativeLabel: "English",
    description: "Default language for workspace UI and outputs.",
  },
  {
    value: "Hindi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    description: "Translate supported workspace content into Hindi.",
  },
  {
    value: "Tamil",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    description: "Translate supported workspace content into Tamil.",
  },
  {
    value: "Bengali",
    label: "Bengali",
    nativeLabel: "বাংলা",
    description: "Translate supported workspace content into Bengali.",
  },
];

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((item) => item.value === value);
}

export function getLanguageOption(value: string) {
  return SUPPORTED_LANGUAGES.find((item) => item.value === value) || SUPPORTED_LANGUAGES[0];
}

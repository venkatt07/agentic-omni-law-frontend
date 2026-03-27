import { Languages, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getLanguageOption, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/languages";

type LanguagePreferenceSelectProps = {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void | Promise<void>;
  disabled?: boolean;
  pending?: boolean;
  label?: string;
  helperText?: string;
  compact?: boolean;
  className?: string;
};

export function LanguagePreferenceSelect({
  value,
  onChange,
  disabled = false,
  pending = false,
  label = "Preferred Language",
  helperText,
  compact = false,
  className,
}: LanguagePreferenceSelectProps) {
  const selectedLanguage = getLanguageOption(value);

  return (
    <div className={cn("space-y-2 min-w-0", className)}>
      {!compact ? (
        <div>
          <Label htmlFor="preferred-language">{label}</Label>
          {helperText ? <p className="mt-1 text-sm text-muted-foreground">{helperText}</p> : null}
        </div>
      ) : null}
      <div className="relative">
        <Select
          value={value}
          onValueChange={(nextValue) => void onChange(nextValue as SupportedLanguage)}
          disabled={disabled || pending}
        >
            <SelectTrigger
              id="preferred-language"
              className={cn(
                "w-full rounded-xl pl-10",
                compact
                ? "h-8 min-w-[6.75rem] rounded-lg border-white/10 bg-white/68 pl-7 pr-7 text-[13px] font-medium shadow-none dark:bg-white/[0.05]"
                : "h-11 pr-10",
              )}
            >
            {compact ? (
              <span className="block truncate text-left">{selectedLanguage.label}</span>
            ) : (
              <SelectValue placeholder={label} />
            )}
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((language) => (
              <SelectItem key={language.value} value={language.value}>
                {language.label} ({language.nativeLabel})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Languages className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", compact ? "left-1.5 h-3 w-3" : "left-2.5 h-3.5 w-3.5")} />
        {pending ? <Loader2 className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 animate-spin text-muted-foreground", compact ? "right-1.5 h-3 w-3" : "right-2.5 h-3.5 w-3.5")} /> : null}
      </div>
    </div>
  );
}

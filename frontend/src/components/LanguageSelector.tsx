import { useId } from "react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "../lib/analytics";
import { cn } from "../lib/utils";

type LanguageCode = "en" | "ja";

const languageOptions: ReadonlyArray<{
  code: LanguageCode;
  label: string;
}> = [
  { code: "en", label: "🇺🇸 English" },
  { code: "ja", label: "🇯🇵 日本語" },
];

export default function LanguageSelector({
  className,
}: {
  className?: string;
}) {
  const { t, i18n } = useTranslation("common");
  const groupName = `language-${useId()}`;
  const currentLanguage: LanguageCode = i18n.resolvedLanguage?.startsWith("ja")
    ? "ja"
    : "en";

  const changeLanguage = (language: LanguageCode) => {
    if (language === currentLanguage) return;
    i18n.changeLanguage(language);
    trackEvent({
      name: "change_language",
      data: { language },
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("language")}
      className={cn("inline-flex items-center gap-3 text-xs", className)}
    >
      {languageOptions.map((option) => {
        const selected = currentLanguage === option.code;
        return (
          <label key={option.code} className="cursor-pointer">
            <input
              type="radio"
              name={groupName}
              value={option.code}
              checked={selected}
              onChange={() => changeLanguage(option.code)}
              className="sr-only"
            />
            <span
              className={cn(
                "inline-block border-b-2 py-1 transition-colors",
                selected
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

import { useId } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { UPDATE_PROFILE } from "@/graphql/account";
import { useAuth } from "@/contexts/AuthContext";
import { LANGUAGES, type AppLanguage } from "@/i18n";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** Language switch; for signed-in users the choice is saved in the profile. */
export default function LanguageSelector({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const name = `language-${useId()}`;
  const current: AppLanguage = i18n.resolvedLanguage?.startsWith("ja") ? "ja" : "en";

  const change = (lng: AppLanguage) => {
    if (lng === current) return;
    void i18n.changeLanguage(lng);
    trackEvent({ name: "change_language", data: { language: lng } });
    if (user)
      void updateProfile({ variables: { input: { language: lng } } }).catch(() => undefined);
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("language")}
      className={cn("inline-flex items-center gap-3 text-xs", className)}
    >
      {LANGUAGES.map((lng) => (
        <label key={lng} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={lng}
            checked={current === lng}
            onChange={() => change(lng)}
            className="sr-only peer"
          />
          <span
            lang={lng}
            className={cn(
              "inline-block border-b-2 py-1 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring rounded-sm",
              current === lng
                ? "border-primary font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`languages.${lng}`)}
          </span>
        </label>
      ))}
    </div>
  );
}

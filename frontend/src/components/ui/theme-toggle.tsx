import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={t("actions.toggleTheme")}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDark ? "bg-primary" : "bg-gray-300",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform",
          isDark ? "translate-x-6" : "translate-x-0.5",
        )}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-primary" aria-hidden="true" />
        ) : (
          <Sun className="h-3 w-3 text-yellow-500" aria-hidden="true" />
        )}
      </span>
    </button>
  );
};

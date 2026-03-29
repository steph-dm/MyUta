import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { REGISTER } from "../graphql/queries";
import { trackEvent } from "../lib/analytics";
import { translateError } from "../lib/error-messages";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ThemeToggle } from "../components/ui/theme-toggle";
import { cn } from "../lib/utils";

const BIRTHDATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;

function parseBirthdateInput(value: string): Date | null {
  if (!BIRTHDATE_RE.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("/").map(Number);
  const birthdate = new Date(year, month - 1, day);

  if (
    birthdate.getFullYear() !== year ||
    birthdate.getMonth() !== month - 1 ||
    birthdate.getDate() !== day
  ) {
    return null;
  }

  return birthdate;
}

function formatBirthdateForApi(value: string): string {
  return value.replace(/\//g, "-");
}

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    birthdate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, i18n } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");

  const [registerMutation, { loading }] = useMutation(REGISTER, {
    onCompleted: (data) => {
      trackEvent({ name: "register" });
      login(data.register.user);
      navigate("/dashboard");
    },
    onError: (error) => {
      if (error.graphQLErrors?.[0]?.extensions?.field) {
        const field = error.graphQLErrors[0].extensions.field as string;
        setErrors({ [field]: translateError(error.message, tCommon) });
      } else {
        setErrors({ submit: translateError(error.message, tCommon) });
      }
    },
  });

  const validatePassword = (password: string) => {
    return [
      { test: password.length >= 12, text: t("validation.passwordMin") },
      { test: /[a-z]/.test(password), text: t("validation.passwordLowercase") },
      { test: /[A-Z]/.test(password), text: t("validation.passwordUppercase") },
      { test: /[0-9]/.test(password), text: t("validation.passwordNumber") },
      {
        test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        text: t("validation.passwordSpecial"),
      },
    ];
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const trimmedEmail = formData.email.trim();
    const trimmedName = formData.name.trim();

    if (!trimmedEmail) {
      newErrors.email = t("validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = t("validation.emailInvalid");
    }

    if (!trimmedName) {
      newErrors.name = t("validation.usernameRequired");
    } else if (trimmedName.length > 20) {
      newErrors.name = t("validation.usernameLength");
    }

    if (!formData.birthdate) {
      newErrors.birthdate = t("validation.birthdateRequired");
    } else if (!BIRTHDATE_RE.test(formData.birthdate)) {
      newErrors.birthdate = t("validation.dateFormat");
    } else {
      const birthdate = parseBirthdateInput(formData.birthdate);
      if (!birthdate) {
        newErrors.birthdate = t("validation.invalidDate");
      } else {
        const today = new Date();
        const age = today.getFullYear() - birthdate.getFullYear();
        const monthDiff = today.getMonth() - birthdate.getMonth();
        const adjustedAge =
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthdate.getDate())
            ? age - 1
            : age;

        if (adjustedAge < 13) {
          newErrors.birthdate = t("validation.ageMinimum");
        } else if (adjustedAge > 120) {
          newErrors.birthdate = t("validation.invalidDate");
        }
      }
    }

    const passwordRequirements = validatePassword(formData.password);
    const failedRequirements = passwordRequirements.filter((req) => !req.test);
    if (failedRequirements.length > 0) {
      newErrors.password = t("validation.passwordMustHave", {
        requirements: failedRequirements.map((req) => req.text).join(", "),
      });
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("validation.passwordMismatch");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "birthdate") {
      let formatted = value.replace(/\D/g, "");
      if (formatted.length >= 4) {
        formatted = `${formatted.slice(0, 4)}/${formatted.slice(4)}`;
      }
      if (formatted.length >= 7) {
        formatted = `${formatted.slice(0, 7)}/${formatted.slice(7, 9)}`;
      }
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setErrors((prev) => ({ ...prev, [name]: "", submit: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    await registerMutation({
      variables: {
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        birthdate: formatBirthdateForApi(formData.birthdate),
      },
    });
  };

  const passwordRequirements = validatePassword(formData.password);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs px-2 h-7 text-muted-foreground"
          onClick={() => {
            i18n.changeLanguage(i18n.language === "ja" ? "en" : "ja");
          }}
        >
          {i18n.language === "ja" ? "🇺🇸 EN" : "🇯🇵 JA"}
        </Button>
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            {t("register.title")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("register.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-500 dark:border-red-800 dark:bg-red-950">
                {errors.submit}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("register.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("register.emailPlaceholder")}
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={cn(errors.email && "border-red-500")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t("register.username")}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t("register.usernamePlaceholder")}
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                minLength={1}
                maxLength={20}
                className={cn(errors.name && "border-red-500")}
              />
              <p className="text-xs text-muted-foreground">
                {t("register.usernameHint")}
              </p>
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">{t("register.birthdate")}</Label>
              <Input
                id="birthdate"
                name="birthdate"
                type="text"
                placeholder="YYYY/MM/DD"
                value={formData.birthdate}
                onChange={handleChange}
                disabled={loading}
                maxLength={10}
                className={cn(errors.birthdate && "border-red-500")}
              />
              <p className="text-xs text-muted-foreground">
                {t("register.birthdateHint")}
              </p>
              {errors.birthdate && (
                <p className="text-sm text-red-500">{errors.birthdate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("register.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setShowPasswordHints(true)}
                disabled={loading}
                className={cn(errors.password && "border-red-500")}
              />
              {showPasswordHints && formData.password && (
                <div className="space-y-1 rounded-md bg-muted p-2 text-xs">
                  <p className="font-medium text-muted-foreground">
                    {t("register.passwordRequirementsLabel")}
                  </p>
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-1",
                        req.test
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground",
                      )}
                    >
                      <span>{req.test ? "✓" : "○"}</span>
                      <span>{req.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("register.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                className={cn(errors.confirmPassword && "border-red-500")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("register.submitting") : t("register.submit")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t("register.hasAccount")}{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                {t("register.loginLink")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

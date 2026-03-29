import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { LOGIN } from "../graphql/queries";
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

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, i18n } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");

  const [loginMutation, { loading }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      trackEvent({ name: "login" });
      login(data.login.user);
      navigate("/dashboard");
    },
    onError: (error) => {
      setErrors({ submit: translateError(error.message, tCommon) });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t("validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("validation.emailInvalid");
    }

    if (!formData.password) {
      newErrors.password = t("validation.passwordRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "", submit: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    await loginMutation({
      variables: {
        email: formData.email,
        password: formData.password,
      },
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative">
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
          <CardTitle className="text-2xl font-bold text-center">
            {t("login.title")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("login.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
                {errors.submit}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("login.emailPlaceholder")}
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
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className={cn(errors.password && "border-red-500")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("login.submitting") : t("login.submit")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t("login.noAccount")}{" "}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                {t("login.register")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

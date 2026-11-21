import { useId, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { REGISTER } from "@/graphql/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared";
import { safeNext } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useServerInfo } from "@/hooks/useServerInfo";
import { currentLanguage } from "@/i18n";
import { trackEvent } from "@/lib/analytics";
import { errorMessage, fieldErrors } from "@/lib/errors";
import AuthShell from "./AuthShell";

export default function Register() {
  const { t } = useTranslation("auth");
  const id = useId();
  const { user, signedIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { passwordMinLength } = useServerInfo();
  const [form, setForm] = useState({ email: "", name: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [register, { loading }] = useMutation(REGISTER);
  if (user) return <Navigate to={next} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "", form: "" }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = t("validation.emailRequired");
    if (!form.name.trim()) errs.name = t("validation.nameRequired");
    if (Array.from(form.password).length < passwordMinLength)
      errs.password = t("validation.passwordMin", { min: passwordMinLength });
    if (form.password !== form.confirm) errs.confirm = t("validation.passwordMismatch");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const { data } = await register({
        variables: {
          input: {
            email: form.email,
            name: form.name,
            password: form.password,
            language: currentLanguage(),
          },
        },
      });
      if (data?.register) {
        trackEvent({ name: "register" });
        await signedIn(data.register);
        navigate(next, { replace: true });
      }
    } catch (err) {
      setErrors({ ...fieldErrors(err, t), form: errorMessage(err, t) });
    }
  };

  const field = (
    k: keyof typeof form,
    label: string,
    type: string,
    autoComplete: string,
    hint?: string,
    maxLength?: number,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`${id}-${k}`}>{label}</Label>
      <Input
        id={`${id}-${k}`}
        type={type}
        autoComplete={autoComplete}
        value={form[k]}
        onChange={set(k)}
        maxLength={maxLength}
        disabled={loading}
        aria-invalid={!!errors[k]}
        aria-describedby={
          [errors[k] ? `${id}-${k}-error` : "", hint ? `${id}-${k}-hint` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {hint && (
        <p id={`${id}-${k}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-${k}-error`} message={errors[k]} />
    </div>
  );

  return (
    <AuthShell
      title={t("register.title")}
      subtitle={t("register.subtitle")}
      footer={
        <>
          {t("register.hasAccount")}{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t("register.login")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && (
          <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {errors.form}
          </div>
        )}
        {field("email", t("fields.email"), "email", "email")}
        {field("name", t("fields.name"), "text", "nickname", t("fields.nameHint"), 30)}
        {field(
          "password",
          t("fields.password"),
          "password",
          "new-password",
          t("fields.passwordHint", { min: passwordMinLength }),
        )}
        {field("confirm", t("fields.confirmPassword"), "password", "new-password")}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("register.submitting") : t("register.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}

import { useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { LOGIN } from "@/graphql/account";
import type { UserFieldsFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared";
import { errorMessage } from "@/lib/errors";
import { trackEvent } from "@/lib/analytics";

/** E-mail/password form used by the login page and the re-login dialog. */
export default function LoginForm({
  onSuccess,
  defaultEmail = "",
}: {
  onSuccess: (u: UserFieldsFragment) => void;
  defaultEmail?: string;
}) {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [login, { loading }] = useMutation(LOGIN);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = t("validation.emailRequired");
    if (!password) next.password = t("validation.passwordRequired");
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      const { data } = await login({ variables: { email, password } });
      if (data?.login) {
        trackEvent({ name: "login" });
        onSuccess(data.login);
      }
    } catch (err) {
      setErrors({ form: errorMessage(err, t) });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {errors.form && (
        <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {errors.form}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="login-email">{t("fields.email")}</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          disabled={loading}
        />
        <FieldError id="login-email-error" message={errors.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">{t("fields.password")}</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          disabled={loading}
        />
        <FieldError id="login-password-error" message={errors.password} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  );
}

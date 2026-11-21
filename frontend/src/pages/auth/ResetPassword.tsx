import { useId, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { RESET_PASSWORD } from "@/graphql/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared";
import { useServerInfo } from "@/hooks/useServerInfo";
import { errorMessage } from "@/lib/errors";
import AuthShell from "./AuthShell";

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const id = useId();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { passwordMinLength } = useServerInfo();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [reset, { loading }] = useMutation(RESET_PASSWORD);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (Array.from(password).length < passwordMinLength)
      return setError(t("validation.passwordMin", { min: passwordMinLength }));
    if (password !== confirm) return setError(t("validation.passwordMismatch"));
    try {
      await reset({ variables: { token, newPassword: password } });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, t));
    }
  };

  return (
    <AuthShell
      title={t("reset.title")}
      footer={
        <Link to="/login" className="text-primary hover:underline">
          {t("forgot.back")}
        </Link>
      }
    >
      {!token ? (
        <p className="text-sm text-muted-foreground">{t("reset.missingToken")}</p>
      ) : done ? (
        <p role="status" className="text-sm">
          {t("reset.done")}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor={`${id}-pw`}>{t("fields.newPassword")}</Label>
            <Input
              id={`${id}-pw`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={`${id}-hint`}
            />
            <p id={`${id}-hint`} className="text-xs text-muted-foreground">
              {t("fields.passwordHint", { min: passwordMinLength })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-confirm`}>{t("fields.confirmPassword")}</Label>
            <Input
              id={`${id}-confirm`}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <FieldError id={`${id}-error`} message={error} />
          <Button type="submit" className="w-full" disabled={loading}>
            {t("reset.submit")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

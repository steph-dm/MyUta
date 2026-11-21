import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { REQUEST_PASSWORD_RESET } from "@/graphql/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerInfo } from "@/hooks/useServerInfo";
import { errorMessage } from "@/lib/errors";
import AuthShell from "./AuthShell";

export default function ForgotPassword() {
  const { t } = useTranslation("auth");
  const id = useId();
  const { mailEnabled } = useServerInfo();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [request, { loading }] = useMutation(REQUEST_PASSWORD_RESET);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError(t("validation.emailRequired"));
    try {
      await request({ variables: { email } });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, t));
    }
  };

  return (
    <AuthShell
      title={t("forgot.title")}
      subtitle={mailEnabled ? t("forgot.subtitle") : undefined}
      footer={
        <Link to="/login" className="text-primary hover:underline">
          {t("forgot.back")}
        </Link>
      }
    >
      {!mailEnabled ? (
        <p className="text-sm text-muted-foreground">{t("forgot.unavailable")}</p>
      ) : sent ? (
        <p role="status" className="text-sm">
          {t("forgot.sent")}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={`${id}-email`}>{t("fields.email")}</Label>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {t("forgot.submit")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

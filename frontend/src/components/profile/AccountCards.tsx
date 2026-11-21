import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, LogOut, Mail, Trash2, User } from "lucide-react";
import {
  CHANGE_EMAIL,
  CHANGE_PASSWORD,
  DELETE_ACCOUNT,
  LOGOUT_EVERYWHERE,
  RESEND_VERIFICATION,
  UPDATE_PROFILE,
} from "@/graphql/account";
import type { MachineType, UserFieldsFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, MachinePicker } from "@/components/shared";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useServerInfo } from "@/hooks/useServerInfo";
import { trackEvent } from "@/lib/analytics";
import { errorMessage, fieldErrors } from "@/lib/errors";

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
      {message}
    </div>
  );
}

export function PersonalInfoCard({ user }: { user: UserFieldsFragment }) {
  const { t } = useTranslation("profile");
  const id = useId();
  const [name, setName] = useState(user.name);
  const [machine, setMachine] = useState<MachineType | null>(user.defaultMachineType ?? null);
  const [error, setError] = useState<string>();
  const [update, { loading }] = useMutation(UPDATE_PROFILE);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      await update({ variables: { input: { name: name.trim(), defaultMachineType: machine } } });
      toast.success(t("personal.saved"));
    } catch (err) {
      setError(errorMessage(err, t));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" aria-hidden="true" /> {t("personal.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <FormError message={error} />
          <div className="space-y-2 max-w-md">
            <Label htmlFor={`${id}-name`}>{t("personal.name")}</Label>
            <Input
              id={`${id}-name`}
              autoComplete="nickname"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              aria-describedby={`${id}-count`}
            />
            <p id={`${id}-count`} className="text-xs text-muted-foreground">
              {t("personal.characters", { count: Array.from(name).length, max: 30 })}
            </p>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">{t("personal.defaultMachine")}</span>
            <p className="text-sm text-muted-foreground">{t("personal.defaultMachineDesc")}</p>
            <MachinePicker
              label={t("personal.defaultMachine")}
              value={machine}
              onChange={setMachine}
              allowNone
              noneLabel={t("personal.none")}
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">{t("preferences.language")}</span>
            <p className="text-sm text-muted-foreground">{t("preferences.languageDesc")}</p>
            <LanguageSelector className="text-sm" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? t("common:actions.saving") : t("common:actions.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function EmailCard({ user }: { user: UserFieldsFragment }) {
  const { t } = useTranslation("profile");
  const id = useId();
  const { mailEnabled } = useServerInfo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string>();
  const [change, { loading }] = useMutation(CHANGE_EMAIL);
  const [resend, { loading: resending }] = useMutation(RESEND_VERIFICATION);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSentTo(undefined);
    try {
      const { data } = await change({ variables: { newEmail: email, password } });
      setPassword("");
      if (data?.changeEmail.verificationSent) setSentTo(email.trim().toLowerCase());
      else toast.success(t("email.changed"));
      setEmail("");
    } catch (err) {
      setErrors({ ...fieldErrors(err, t), form: errorMessage(err, t) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5" aria-hidden="true" /> {t("email.title")}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>
            {t("email.current")}: <strong>{user.email}</strong>
          </span>
          {user.emailVerified ? (
            <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t("email.verified")}
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400">{t("email.unverified")}</span>
          )}
          {!user.emailVerified && mailEnabled && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              disabled={resending}
              onClick={() =>
                resend()
                  .then(() => toast.success(t("email.resent")))
                  .catch((e) => toast.error(errorMessage(e, t)))
              }
            >
              {t("email.resend")}
            </Button>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError message={errors.form} />
          {sentTo && (
            <p role="status" className="text-sm text-green-700 dark:text-green-400">
              {t("email.sent", { email: sentTo })}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${id}-email`}>{t("email.new")}</Label>
              <Input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${id}-email-error` : undefined}
              />
              <FieldError id={`${id}-email-error`} message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-pw`}>{t("email.password")}</Label>
              <Input
                id={`${id}-pw`}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? `${id}-pw-error` : undefined}
              />
              <FieldError id={`${id}-pw-error`} message={errors.password} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !email || !password}>
              {t("email.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordCard() {
  const { t } = useTranslation("profile");
  const id = useId();
  const { passwordMinLength } = useServerInfo();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [change, { loading }] = useMutation(CHANGE_PASSWORD);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (Array.from(next).length < passwordMinLength)
      errs.newPassword = t("auth:validation.passwordMin", { min: passwordMinLength });
    if (next !== confirm) errs.confirm = t("auth:validation.passwordMismatch");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await change({ variables: { currentPassword: current, newPassword: next } });
      trackEvent({ name: "change_password" });
      toast.success(t("password.changed"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setErrors({ ...fieldErrors(err, t), form: errorMessage(err, t) });
    }
  };

  const field = (
    key: string,
    label: string,
    value: string,
    set: (v: string) => void,
    autoComplete: string,
    hint?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={
          [errors[key] ? `${id}-${key}-error` : "", hint ? `${id}-${key}-hint` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {hint && (
        <p id={`${id}-${key}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-${key}-error`} message={errors[key]} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5" aria-hidden="true" /> {t("password.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError message={errors.form} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {field(
              "currentPassword",
              t("password.current"),
              current,
              setCurrent,
              "current-password",
            )}
            {field(
              "newPassword",
              t("auth:fields.newPassword"),
              next,
              setNext,
              "new-password",
              t("auth:fields.passwordHint", { min: passwordMinLength }),
            )}
            {field(
              "confirm",
              t("auth:fields.confirmPassword"),
              confirm,
              setConfirm,
              "new-password",
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !current || !next}>
              {t("password.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SessionsCard() {
  const { t } = useTranslation("profile");
  const { logout } = useAuth();
  const [run, { loading }] = useMutation(LOGOUT_EVERYWHERE);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LogOut className="h-5 w-5" aria-hidden="true" /> {t("sessions.title")}
        </CardTitle>
        <CardDescription>{t("sessions.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          disabled={loading}
          onClick={async () => {
            await run().catch(() => undefined);
            trackEvent({ name: "logout_everywhere" });
            await logout();
          }}
        >
          {t("sessions.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DeleteAccountCard({ reviewCount }: { reviewCount: number }) {
  const { t } = useTranslation("profile");
  const id = useId();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [remove, { loading }] = useMutation(DELETE_ACCOUNT);

  const confirm = async () => {
    if (!password) {
      setError(t("auth:validation.passwordRequired"));
      return;
    }
    try {
      await remove({ variables: { password } });
      setOpen(false);
      await logout();
    } catch (err) {
      setError(errorMessage(err, t));
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle className="text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
          <Trash2 className="h-5 w-5" aria-hidden="true" /> {t("delete.title")}
        </CardTitle>
        <CardDescription>{t("delete.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {t("delete.button")}
        </Button>
      </CardContent>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setPassword("");
            setError(undefined);
          }
        }}
        title={t("delete.confirmTitle")}
        description={t("delete.confirmDesc", { reviews: reviewCount })}
        confirmLabel={loading ? t("common:actions.deleting") : t("delete.button")}
        destructive
        busy={loading}
        onConfirm={() => void confirm()}
      >
        <div className="space-y-2">
          <Label htmlFor={`${id}-pw`}>{t("delete.password")}</Label>
          <Input
            id={`${id}-pw`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <FieldError id={`${id}-error`} message={error} />
        </div>
      </ConfirmDialog>
    </Card>
  );
}

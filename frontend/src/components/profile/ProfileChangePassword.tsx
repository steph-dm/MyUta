import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { CHANGE_PASSWORD } from "../../graphql/queries";
import { trackEvent } from "../../lib/analytics";
import { translateError } from "../../lib/error-messages";

const validatePassword = (
  password: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null => {
  if (password.length < 12) {
    return t("validation.passwordMin", { ns: "auth" });
  }
  if (!/[a-z]/.test(password)) {
    return t("validation.passwordLowercase", { ns: "auth" });
  }
  if (!/[A-Z]/.test(password)) {
    return t("validation.passwordUppercase", { ns: "auth" });
  }
  if (!/[0-9]/.test(password)) {
    return t("validation.passwordNumber", { ns: "auth" });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return t("validation.passwordSpecial", { ns: "auth" });
  }

  return null;
};

const ProfileChangePassword = () => {
  const { t } = useTranslation("profile");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [changePassword, { loading: changingPassword }] = useMutation(
    CHANGE_PASSWORD,
    {
      onCompleted: () => {
        trackEvent({ name: "change_password" });
        setPasswordSuccess(t("changePassword.success"));
        setPasswordError("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(""), 3000);
      },
      onError: (error) => {
        setPasswordError(translateError(error.message, t));
        setPasswordSuccess("");
      },
    },
  );

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError(t("changePassword.mismatch"));
      return;
    }

    const passwordValidationError = validatePassword(newPassword, t);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    try {
      await changePassword({
        variables: { currentPassword, newPassword },
      });
      toast(t("toast.passwordUpdated"));
    } catch {
      toast.error(t("toast.passwordUpdateFailed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="h-5 w-5" /> {t("changePassword.title")}
        </CardTitle>
        <CardDescription>{t("changePassword.title")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordSuccess && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {passwordSuccess}
              </AlertDescription>
            </Alert>
          )}

          {passwordError && (
            <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {passwordError}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("changePassword.current")}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("changePassword.new")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("changePassword.confirm")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={12}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? t("changePassword.submitting") : t("changePassword.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileChangePassword;

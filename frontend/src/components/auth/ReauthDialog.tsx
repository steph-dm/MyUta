import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "./LoginForm";

/**
 * Shown on top of the current page when the session expires, so nothing the
 * user typed is lost; after signing in they can simply submit again.
 */
export default function ReauthDialog() {
  const { t } = useTranslation();
  const { sessionExpired, signedIn, user, logout } = useAuth();
  return (
    <Dialog open={sessionExpired}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          // the address is known: go straight to the password
          e.preventDefault();
          document.getElementById("login-password")?.focus();
        }}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <DialogTitle>{t("session.expiredTitle")}</DialogTitle>
          <DialogDescription>{t("session.expiredDesc")}</DialogDescription>
        </DialogHeader>
        <LoginForm defaultEmail={user?.email} onSuccess={(u) => void signedIn(u)} />
        <Button variant="ghost" onClick={() => void logout()}>
          {t("actions.logout")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoginForm from "@/components/auth/LoginForm";
import { safeNext } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import AuthShell from "./AuthShell";

export default function Login() {
  const { t } = useTranslation("auth");
  const { user, signedIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  if (user) return <Navigate to={next} replace />;
  return (
    <AuthShell
      title={t("login.title")}
      subtitle={t("login.subtitle")}
      footer={
        <>
          <p>
            <Link to="/forgot-password" className="text-primary hover:underline">
              {t("login.forgot")}
            </Link>
          </p>
          <p className="mt-2">
            {t("login.noAccount")}{" "}
            <Link
              to={`/register${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-primary hover:underline font-medium"
            >
              {t("login.register")}
            </Link>
          </p>
        </>
      }
    >
      <LoginForm
        onSuccess={async (u) => {
          await signedIn(u);
          navigate(next, { replace: true });
        }}
      />
    </AuthShell>
  );
}

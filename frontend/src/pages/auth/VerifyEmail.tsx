import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApolloClient, useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { ME, VERIFY_EMAIL } from "@/graphql/account";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import AuthShell from "./AuthShell";

export default function VerifyEmail() {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const client = useApolloClient();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | { error: string }>(() =>
    token ? "working" : { error: t("reset.missingToken") },
  );
  const [verify] = useMutation(VERIFY_EMAIL);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return; // tokens are single-use: never send twice (StrictMode)
    started.current = true;
    verify({ variables: { token } })
      .then(() => {
        setState("done");
        void client.refetchQueries({ include: [ME] });
      })
      .catch((e) => setState({ error: errorMessage(e, t) }));
  }, [token, verify, client, t]);

  return (
    <AuthShell title={t("verify.title")}>
      <p role="status" className="text-sm">
        {state === "working"
          ? t("verify.working")
          : state === "done"
            ? t("verify.done")
            : state.error}
      </p>
      {state !== "working" && (
        <Button asChild className="w-full">
          <Link to="/dashboard">{t("verify.continue")}</Link>
        </Button>
      )}
    </AuthShell>
  );
}

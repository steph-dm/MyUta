import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LOGOUT, ME } from "@/graphql/account";
import type { UserFieldsFragment } from "@/gql/graphql";
import { sessionEvents } from "@/lib/apollo";
import { trackEvent } from "@/lib/analytics";

interface AuthContextValue {
  user: UserFieldsFragment | null;
  loading: boolean;
  /** True when a request found the session expired while the user was signed in. */
  sessionExpired: boolean;
  /** Called after a successful login/registration/re-login. */
  signedIn: (user: UserFieldsFragment) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const { i18n, t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(ME, {
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });
  const [logoutMutation] = useMutation(LOGOUT);
  const [sessionExpired, setSessionExpired] = useState(false);
  const user = data?.me ?? null;

  // The profile language wins over the browser default once signed in.
  useEffect(() => {
    if (user?.language && !i18n.resolvedLanguage?.startsWith(user.language)) {
      void i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);

  useEffect(
    () =>
      sessionEvents.on("expired", () => {
        if (client.cache.readQuery({ query: ME })?.me) setSessionExpired(true);
      }),
    [client],
  );

  useEffect(() => {
    let last = 0;
    return sessionEvents.on("unavailable", () => {
      if (Date.now() - last > 10_000) {
        last = Date.now();
        toast.error(t("common:session.unavailable"), { id: "service-unavailable" });
      }
    });
  }, [t]);

  const signedIn = useCallback(
    async (u: UserFieldsFragment) => {
      const previous = client.cache.readQuery({ query: ME })?.me;
      setSessionExpired(false);
      if (previous && previous.id !== u.id) {
        await client.clearStore(); // another account: drop the old data
      }
      client.cache.writeQuery({ query: ME, data: { me: u } });
      if (previous?.id === u.id) {
        await client.reFetchObservableQueries(); // same account after expiry: refresh the page data
      }
    },
    [client],
  );

  const logout = useCallback(async () => {
    trackEvent({ name: "logout" });
    try {
      await logoutMutation();
    } finally {
      setSessionExpired(false);
      await client.clearStore();
      client.cache.writeQuery({ query: ME, data: { me: null } });
    }
  }, [client, logoutMutation]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      // A network error is not "logged out": keep showing the loader and retry.
      loading: loading && !data,
      sessionExpired,
      signedIn,
      logout,
    }),
    [user, loading, data, sessionExpired, signedIn, logout],
  );

  useEffect(() => {
    if (!error || data) return;
    const id = window.setTimeout(() => void refetch(), 5000);
    return () => window.clearTimeout(id);
  }, [error, data, refetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

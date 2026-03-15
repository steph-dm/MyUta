import { createContext, useState, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { ME, LOGOUT } from "../graphql/queries";
import type { User } from "../types";
import { trackEvent } from "../lib/analytics";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { loading: queryLoading, refetch } = useQuery(ME, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.me) {
        setUser(data.me);
      }
      setIsInitialized(true);
    },
    onError: () => {
      setUser(null);
      setIsInitialized(true);
    },
  });

  const [logoutMutation] = useMutation(LOGOUT);

  const loading = !isInitialized || queryLoading;

  const login = (user: User) => {
    setUser(user);
  };

  const logout = async () => {
    trackEvent({ name: "logout" });
    try {
      await logoutMutation();
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = "/";
  };

  const refetchUser = async () => {
    const result = await refetch();
    if (result.data?.me) {
      setUser(result.data.me);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

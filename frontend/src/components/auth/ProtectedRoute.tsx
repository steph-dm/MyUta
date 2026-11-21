import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/shared";

/** Sends signed-out visitors to /login and brings them back afterwards (?next=). */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <PageSkeleton />
      </div>
    );
  }
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

/** Only same-site paths are accepted as a redirect target (no //host or \\host). */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\"))
    return "/dashboard";
  return raw;
}

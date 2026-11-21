import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Menu,
  Mic2,
  Music,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import UserAvatar from "@/components/ui/user-avatar";
import { ErrorBoundary } from "@/components/shared";
import ReauthDialog from "@/components/auth/ReauthDialog";
import FloatingPlayer from "@/components/player/FloatingPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { preloadRoute } from "@/router-preload";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/reviews", key: "reviews", icon: ListMusic },
  { to: "/songs", key: "songs", icon: Music },
  { to: "/artists", key: "artists", icon: Mic2 },
] as const;

function readCollapsed(): boolean {
  try {
    return localStorage.getItem("sidebarCollapsed") === "true";
  } catch {
    return false;
  }
}

export default function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const isLarge = useMediaQuery("(min-width: 1024px)");
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isCollapsed = collapsed && isLarge;

  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", String(collapsed));
    } catch {
      // storage unavailable
    }
  }, [collapsed]);
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setDrawerOpen(false);
  }

  // On small screens the closed drawer is inert: not focusable, hidden from screen readers.
  const hidden = !isLarge && !drawerOpen;

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-2 focus:rounded focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="lg:hidden bg-card border-b fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="w-8 h-8" />
          <span className="text-xl font-bold">{t("appName")}</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
          aria-label={drawerOpen ? t("actions.closeMenu") : t("actions.openMenu")}
        >
          {drawerOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </Button>
      </header>

      <aside
        id="app-sidebar"
        inert={hidden || undefined}
        aria-hidden={hidden || undefined}
        className={cn(
          "fixed top-0 left-0 h-screen bg-card border-r z-50 lg:z-30 flex flex-col transition-transform lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-4 border-b">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="w-8 h-8" />
            {!isCollapsed && <span className="text-xl font-bold">{t("appName")}</span>}
          </Link>
        </div>
        <nav aria-label={t("nav.main")} className="flex-1 py-4 px-2 overflow-y-auto">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onMouseEnter={() => preloadRoute(to)}
              onFocus={() => preloadRoute(to)}
              title={isCollapsed ? t(`nav.${key}`) : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 mb-1 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  isCollapsed && "justify-center",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={cn(isCollapsed && "sr-only")}>{t(`nav.${key}`)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3 space-y-2">
          <NavLink
            to="/profile"
            onMouseEnter={() => preloadRoute("/profile")}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted",
                isActive && "bg-primary/10",
                isCollapsed && "justify-center",
              )
            }
            title={isCollapsed ? t("nav.profile") : undefined}
          >
            <UserAvatar name={user?.name ?? ""} email={user?.email} size="sm" />
            <span className={cn("text-sm font-medium truncate", isCollapsed && "sr-only")}>
              {user?.name}
            </span>
          </NavLink>
          <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logout()}
              className={cn(!isCollapsed && "flex-1")}
              aria-label={t("actions.logout")}
              title={t("actions.logout")}
            >
              {isCollapsed ? (
                <LogOut className="h-4 w-4" aria-hidden="true" />
              ) : (
                t("actions.logout")
              )}
            </Button>
            <ThemeToggle />
          </div>
        </div>
        {isLarge && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="absolute -right-3 top-20 bg-card border rounded-full p-1.5 shadow-md"
            aria-label={isCollapsed ? t("actions.expandSidebar") : t("actions.collapseSidebar")}
          >
            <ChevronLeft
              className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        )}
      </aside>

      {drawerOpen && !isLarge && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <main
        id="main"
        className={cn("min-h-screen pt-16 lg:pt-0 pb-28", isCollapsed ? "lg:ml-16" : "lg:ml-64")}
      >
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <FloatingPlayer />
      <ReauthDialog />
    </div>
  );
}

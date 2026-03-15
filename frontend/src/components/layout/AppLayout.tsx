import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { ThemeToggle } from "../ui/theme-toggle";
import UserAvatar from "../ui/user-avatar";
import ErrorBoundary from "../shared/ErrorBoundary";
import { preloadRoute } from "../../router";
import { cn } from "../../lib/utils";
import { Menu, X, ChevronLeft } from "lucide-react";
import MaterialIcon from "../ui/MaterialIcon";

const AppLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (!saved) {
      return false;
    }

    try {
      return JSON.parse(saved) === true;
    } catch {
      localStorage.removeItem("sidebarCollapsed");
      return false;
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const navItems = [
    { path: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
    { path: "/artists", label: t("nav.artists"), icon: "mic" },
    { path: "/songs", label: t("nav.songs"), icon: "music_note" },
    { path: "/reviews", label: t("nav.reviews"), icon: "rate_review" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden transition-colors duration-300">
      <header className="lg:hidden bg-card shadow-sm border-b border-border fixed top-0 left-0 right-0 z-50">
        <div className="flex justify-between items-center px-4 py-3">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img src="/favicon.svg" alt="マイウタ" className="w-8 h-8" />
            <h1 className="text-xl font-bold text-foreground">
              マイウタ
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={isMobileMenuOpen ? t("actions.closeMenu") : t("actions.openMenu")}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-card shadow-lg border-r border-border transition-all duration-300 z-40 flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src="/favicon.svg" alt="マイウタ" className="w-8 h-8" />
              {!isCollapsed && (
                <h1 className="text-xl font-bold text-foreground">
                  マイウタ
                </h1>
              )}
            </Link>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              onMouseEnter={() => preloadRoute(item.path)}
              className={cn(
                "flex items-center px-3 py-3 mb-1 rounded-lg text-sm font-medium transition-all group relative",
                location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <MaterialIcon icon={item.icon} size={20} />
              {!isCollapsed && <span className="ml-3">{item.label}</span>}

              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link
            to="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            onMouseEnter={() => preloadRoute("/profile")}
            className={cn(
              "flex items-center px-3 py-2 mb-2 rounded-lg hover:bg-muted transition-colors group relative",
              isCollapsed ? "justify-center" : "",
            )}
            title={isCollapsed ? user?.name : undefined}
          >
            <UserAvatar
              name={user?.name || ""}
              email={user?.email || ""}
              size="sm"
            />
            {!isCollapsed && (
              <span className="ml-3 text-sm font-medium text-muted-foreground">
                {user?.name}
              </span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                {user?.name}
              </div>
            )}
          </Link>

          {isCollapsed ? (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors group relative"
              title={t("actions.logout")}
            >
              <MaterialIcon icon="logout" size={20} />
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                {t("actions.logout")}
              </div>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="flex-1"
                >
                  {t("actions.logout")}
                </Button>
                <ThemeToggle />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 bg-card border border-border rounded-full p-1.5 shadow-md hover:shadow-lg transition-all hover:bg-muted"
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 text-foreground transition-transform",
              isCollapsed && "rotate-180",
            )}
          />
        </button>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main
        className={cn(
          "transition-all duration-300 min-h-screen pt-16 lg:pt-0",
          isCollapsed ? "lg:ml-16" : "lg:ml-64",
        )}
      >
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

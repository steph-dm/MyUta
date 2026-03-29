import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import i18n from "./i18n";
import AppLayout from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./pages/ProtectedRoute";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/shared/ErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Songs = lazy(() => import("./pages/Songs"));
const SongDetail = lazy(() => import("./pages/SongDetail"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Artist = lazy(() => import("./pages/Artist"));
const Artists = lazy(() => import("./pages/Artists"));
const Profile = lazy(() => import("./pages/Profile"));

const routeImports: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("./pages/Dashboard"),
  "/songs": () => import("./pages/Songs"),
  "/reviews": () => import("./pages/Reviews"),
  "/artists": () => import("./pages/Artists"),
  "/profile": () => import("./pages/Profile"),
};

export function preloadRoute(path: string) {
  routeImports[path]?.();
}

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense
      fallback={
        <div className="flex justify-center py-12 text-muted-foreground">
          {i18n.t("common:actions.loading")}
        </div>
      }
    >
      {children}
    </Suspense>
  </ErrorBoundary>
);

const ProtectedLayout = (
  <ProtectedRoute>
    <AppLayout />
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    element: ProtectedLayout,
    children: [
      {
        path: "/dashboard",
        element: (
          <Lazy>
            <Dashboard />
          </Lazy>
        ),
      },
      {
        path: "/songs",
        element: (
          <Lazy>
            <Songs />
          </Lazy>
        ),
      },
      {
        path: "/songs/:id",
        element: (
          <Lazy>
            <SongDetail />
          </Lazy>
        ),
      },
      {
        path: "/reviews",
        element: (
          <Lazy>
            <Reviews />
          </Lazy>
        ),
      },
      {
        path: "/artists",
        element: (
          <Lazy>
            <Artists />
          </Lazy>
        ),
      },
      {
        path: "/artists/:id",
        element: (
          <Lazy>
            <Artist />
          </Lazy>
        ),
      },
      {
        path: "/profile",
        element: (
          <Lazy>
            <Profile />
          </Lazy>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

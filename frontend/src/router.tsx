import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { PageSkeleton } from "@/components/shared";
import { pages } from "@/router-preload";

const Landing = lazy(pages.landing);
const Login = lazy(pages.login);
const Register = lazy(pages.register);
const ForgotPassword = lazy(pages.forgot);
const ResetPassword = lazy(pages.reset);
const VerifyEmail = lazy(pages.verify);
const Dashboard = lazy(pages.dashboard);
const Reviews = lazy(pages.reviews);
const Songs = lazy(pages.songs);
const SongDetail = lazy(pages.song);
const Artists = lazy(pages.artists);
const ArtistDetail = lazy(pages.artist);
const Profile = lazy(pages.profile);
const NotFound = lazy(pages.notFound);

const page = (el: ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

export const router = createBrowserRouter([
  { path: "/", element: page(<Landing />) },
  { path: "/login", element: page(<Login />) },
  { path: "/register", element: page(<Register />) },
  { path: "/forgot-password", element: page(<ForgotPassword />) },
  { path: "/reset-password", element: page(<ResetPassword />) },
  { path: "/verify-email", element: page(<VerifyEmail />) },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: page(<Dashboard />) },
      { path: "/reviews", element: page(<Reviews />) },
      { path: "/songs", element: page(<Songs />) },
      { path: "/songs/:id", element: page(<SongDetail />) },
      { path: "/artists", element: page(<Artists />) },
      { path: "/artists/:id", element: page(<ArtistDetail />) },
      { path: "/profile", element: page(<Profile />) },
    ],
  },
  { path: "*", element: <Outlet />, children: [{ path: "*", element: page(<NotFound />) }] },
]);

/** Lazy page modules, shared by the router and the hover preloading in the navigation. */
export const pages = {
  landing: () => import("@/pages/Landing"),
  login: () => import("@/pages/auth/Login"),
  register: () => import("@/pages/auth/Register"),
  forgot: () => import("@/pages/auth/ForgotPassword"),
  reset: () => import("@/pages/auth/ResetPassword"),
  verify: () => import("@/pages/auth/VerifyEmail"),
  dashboard: () => import("@/pages/Dashboard"),
  reviews: () => import("@/pages/Reviews"),
  songs: () => import("@/pages/Songs"),
  song: () => import("@/pages/SongDetail"),
  artists: () => import("@/pages/Artists"),
  artist: () => import("@/pages/ArtistDetail"),
  profile: () => import("@/pages/Profile"),
  notFound: () => import("@/pages/NotFound"),
};

const byPath: Record<string, () => Promise<unknown>> = {
  "/dashboard": pages.dashboard,
  "/reviews": pages.reviews,
  "/songs": pages.songs,
  "/artists": pages.artists,
  "/profile": pages.profile,
};

export function preloadRoute(path: string) {
  void byPath[path]?.();
}

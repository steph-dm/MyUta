import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ApolloProvider } from "@apollo/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import "./i18n";
import { AuthProvider } from "./contexts/AuthContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ErrorBoundary } from "./components/shared";
import { createApolloClient } from "./lib/apollo";
import { initAnalytics } from "./lib/analytics";
import { router } from "./router";

const client = createApolloClient();
initAnalytics();

// After a deploy, old chunk names disappear: reload once to get the new ones.
window.addEventListener("vite:preloadError", (event) => {
  const key = "myuta-chunk-reload";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  event.preventDefault();
  window.location.reload();
});
window.setTimeout(() => sessionStorage.removeItem("myuta-chunk-reload"), 10_000);

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" theme={theme} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <ErrorBoundary>
        <ApolloProvider client={client}>
          <ThemeProvider>
            <AuthProvider>
              <PlayerProvider>
                <RouterProvider router={router} />
                <ThemedToaster />
              </PlayerProvider>
            </AuthProvider>
          </ThemeProvider>
        </ApolloProvider>
      </ErrorBoundary>
    </Suspense>
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

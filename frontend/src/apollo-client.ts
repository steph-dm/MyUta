import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  Observable,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ?? "/graphql";

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: "include",
});

let isRefreshing = false;
let pendingRequests: (() => void)[] = [];

const resolvePending = () => {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
};

const refreshToken = async (): Promise<boolean> => {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation { refreshToken { token } }`,
    }),
  });

  const json = await res.json();
  return !!json?.data?.refreshToken;
};

const errorLink = onError(({ graphQLErrors, networkError, forward, operation }) => {
  if (graphQLErrors) {
    const hasAuthError = graphQLErrors.some(
      (e) => e.extensions?.code === "UNAUTHENTICATED"
    );

    if (hasAuthError) {
      const path = window.location.pathname;
      if (path === "/" || path === "/login" || path === "/register") return;

      if (isRefreshing) {
        return new Observable((observer) => {
          pendingRequests.push(() => {
            forward(operation).subscribe(observer);
          });
        });
      }

      isRefreshing = true;

      return new Observable((observer) => {
        refreshToken()
          .then((success) => {
            if (!success) throw new Error("refresh failed");
            resolvePending();
            forward(operation).subscribe(observer);
          })
          .catch(() => {
            pendingRequests = [];
            window.location.href = "/";
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    graphQLErrors.forEach(({ message }) => {
      console.error("GraphQL error:", message);
    });
  }
  if (networkError) {
    console.error("Network error:", networkError);
  }
});

const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;

import { ApolloClient, createHttpLink, from, InMemoryCache } from "@apollo/client";
import { onError } from "@apollo/client/link/error";

export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? "/graphql";

/** Sent with every API request; the server rejects requests without it (CSRF protection). */
export const CLIENT_HEADER = { "X-MyUta-Client": "web" } as const;

type Listener = () => void;

/**
 * Session events raised by the network layer. The UI reacts without reloading
 * the page, so open dialogs keep what the user typed.
 */
export const sessionEvents = {
  expired: new Set<Listener>(),
  unavailable: new Set<Listener>(),
  emit(kind: "expired" | "unavailable") {
    this[kind].forEach((l) => l());
  },
  on(kind: "expired" | "unavailable", l: Listener) {
    this[kind].add(l);
    return () => {
      this[kind].delete(l);
    };
  },
};

// Operations where UNAUTHENTICATED is an expected answer, not an expired session.
const AUTH_OPERATIONS = new Set([
  "Login",
  "Register",
  "Me",
  "ResetPassword",
  "VerifyEmail",
  "RequestPasswordReset",
]);

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (
    graphQLErrors?.some((e) => e.extensions?.code === "UNAUTHENTICATED") &&
    !AUTH_OPERATIONS.has(operation.operationName)
  ) {
    sessionEvents.emit("expired");
  }
  const status = (networkError as { statusCode?: number } | null)?.statusCode;
  if (
    status === 503 ||
    (networkError && !status) ||
    graphQLErrors?.some((e) => e.extensions?.code === "SERVICE_UNAVAILABLE")
  ) {
    sessionEvents.emit("unavailable");
  }
});

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: "include",
  headers: CLIENT_HEADER,
});

export function createApolloClient() {
  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        // Pages are cached per (filter, sort, limit, offset); no merging needed.
        Song: {
          fields: { reviews: { merge: false }, goals: { merge: false }, genres: { merge: false } },
        },
        Artist: { fields: { songs: { merge: false } } },
      },
    }),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network", nextFetchPolicy: "cache-first" },
    },
  });
}

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? "/graphql";

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: "include",
});

const errorLink = onError(
  ({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      const hasAuthError = graphQLErrors.some(
        (e) => e.extensions?.code === "UNAUTHENTICATED",
      );

      if (hasAuthError) {
        const path = window.location.pathname;
        if (path === "/" || path === "/login" || path === "/register") return;
        window.location.href = "/";
        return;
      }

      graphQLErrors.forEach(({ message }) => {
        console.error("GraphQL error:", message);
      });
    }
    if (networkError) {
      console.error("Network error:", networkError);
    }
  },
);

const cache = new InMemoryCache({
  typePolicies: {
    Song: {
      fields: {
        genres: { merge: (_existing, incoming) => incoming },
        reviews: { merge: (_existing, incoming) => incoming },
      },
    },
    Artist: {
      fields: {
        songs: { merge: (_existing, incoming) => incoming },
      },
    },
    Query: {
      fields: {
        myReviews: { merge: (_existing, incoming) => incoming },
        mySongs: { merge: (_existing, incoming) => incoming },
        myFavorites: { merge: (_existing, incoming) => incoming },
        myFavoriteArtists: { merge: (_existing, incoming) => incoming },
      },
    },
  },
});

const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache,
});

export default client;

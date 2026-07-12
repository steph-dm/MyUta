import { gql } from "@apollo/client";

export const GET_ARTISTS = gql`
  query GetArtists {
    artists {
      id
      name
      isFavorite
      songs {
        id
        title
        genres
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_ARTISTS_WITH_STATS = gql`
  query GetArtistsWithStats {
    artists {
      id
      name
      songCount
    }
  }
`;

export const GET_ARTIST = gql`
  query GetArtist($id: ID!) {
    artist(id: $id) {
      id
      name
      isFavorite
      songs {
        id
        title
        genres
        youtubeUrl
        generatedYoutube
        isFavorite
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_ARTIST_SONGS = gql`
  query GetArtistSongs($id: ID!) {
    artist(id: $id) {
      id
      name
      songs {
        id
        title
        youtubeUrl
        generatedYoutube
      }
    }
  }
`;

export const UPSERT_ARTIST = gql`
  mutation UpsertArtist($name: String!) {
    upsertArtist(name: $name) {
      id
      name
      songs {
        id
        title
      }
    }
  }
`;

export const UPDATE_ARTIST = gql`
  mutation UpdateArtist($id: ID!, $name: String!) {
    updateArtist(id: $id, name: $name) {
      id
      name
      songs {
        id
        title
        genres
      }
      isFavorite
      createdAt
      updatedAt
    }
  }
`;

export const TOGGLE_FAVORITE_ARTIST = gql`
  mutation ToggleFavoriteArtist($artistId: ID!) {
    toggleFavoriteArtist(artistId: $artistId)
  }
`;

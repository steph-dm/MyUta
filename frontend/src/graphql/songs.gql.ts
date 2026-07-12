import { gql } from "@apollo/client";

export const GET_SONGS = gql`
  query GetSongs {
    songs {
      id
      title
      genres
      youtubeUrl
      generatedYoutube
      isFavorite
      artist {
        id
        name
      }
    }
  }
`;

export const UPSERT_SONG = gql`
  mutation UpsertSong(
    $id: ID
    $title: String!
    $artistId: ID!
    $genres: [Genre!]!
    $youtubeUrl: String
    $generatedYoutube: Boolean
  ) {
    upsertSong(
      id: $id
      title: $title
      artistId: $artistId
      genres: $genres
      youtubeUrl: $youtubeUrl
      generatedYoutube: $generatedYoutube
    ) {
      id
      title
      genres
      youtubeUrl
      generatedYoutube
      artist {
        id
        name
      }
    }
  }
`;

export const DELETE_SONG = gql`
  mutation DeleteSong($id: ID!) {
    deleteSong(id: $id) {
      id
    }
  }
`;

export const GET_SONG_WITH_REVIEWS = gql`
  query GetSongWithReviews($id: ID!) {
    songWithReviews(id: $id) {
      id
      title
      genres
      youtubeUrl
      generatedYoutube
      reviewCount
      isFavorite
      artist {
        id
        name
      }
      reviews {
        id
        date
        score
        machineType
        issues
        notes
        user {
          id
          name
        }
        song {
          id
          title
          genres
          youtubeUrl
          generatedYoutube
          artist {
            id
            name
          }
        }
      }
    }
  }
`;

export const TOGGLE_FAVORITE = gql`
  mutation ToggleFavorite($songId: ID!) {
    toggleFavorite(songId: $songId)
  }
`;

export const SEARCH_YOUTUBE = gql`
  query SearchYoutube($artist: String!, $song: String!) {
    searchYoutube(artist: $artist, song: $song) {
      videoId
      title
      channelTitle
      duration
      thumbnailUrl
    }
  }
`;

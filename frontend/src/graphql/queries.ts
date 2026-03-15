import { gql } from "@apollo/client";

export const ME = gql`
  query Me {
    me {
      id
      email
      name
      birthdate
      defaultMachineType
      createdAt
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

export const REGISTER = gql`
  mutation Register(
    $email: String!
    $password: String!
    $name: String!
    $birthdate: DateTime!
  ) {
    register(
      email: $email
      password: $password
      name: $name
      birthdate: $birthdate
    ) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser(
    $id: ID!
    $email: String
    $name: String
    $birthdate: DateTime
    $defaultMachineType: MachineType
  ) {
    updateUser(
      id: $id
      email: $email
      name: $name
      birthdate: $birthdate
      defaultMachineType: $defaultMachineType
    ) {
      id
      email
      name
      birthdate
      defaultMachineType
      createdAt
      updatedAt
    }
  }
`;

export const GET_MY_REVIEWS = gql`
  query GetMyReviews($userId: ID!) {
    myReviews(userId: $userId) {
      id
      date
      score
      machineType
      issues
      notes
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
    user(id: $userId) {
      id
      email
      name
      defaultMachineType
    }
  }
`;

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

export const UPSERT_REVIEW = gql`
  mutation UpsertReview(
    $id: ID
    $songId: ID!
    $date: DateTime!
    $score: Float!
    $machineType: MachineType!
    $issues: [Issue!]!
    $notes: String
  ) {
    upsertReview(
      id: $id
      songId: $songId
      date: $date
      score: $score
      machineType: $machineType
      issues: $issues
      notes: $notes
    ) {
      id
      date
      score
      machineType
      issues
      notes
      user {
        id
        name
        email
      }
    }
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

export const DELETE_REVIEW = gql`
  mutation DeleteReview($id: ID!) {
    deleteReview(id: $id) {
      id
    }
  }
`;

export const DELETE_REVIEWS = gql`
  mutation DeleteReviews($ids: [ID!]!) {
    deleteReviews(ids: $ids)
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

export const TOGGLE_FAVORITE_ARTIST = gql`
  mutation ToggleFavoriteArtist($artistId: ID!) {
    toggleFavoriteArtist(artistId: $artistId)
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($password: String!) {
    deleteAccount(password: $password)
  }
`;

export const GET_MY_FAVORITES = gql`
  query GetMyFavorites {
    myFavorites {
      id
      title
      youtubeUrl
      generatedYoutube
      artist {
        id
        name
      }
    }
  }
`;

export const EXPORT_DATA = gql`
  query ExportData {
    exportData
  }
`;

export const EXTRACT_REVIEW_FROM_IMAGE = gql`
  mutation ExtractReviewFromImage($imageBase64: String!) {
    extractReviewFromImage(imageBase64: $imageBase64) {
      songTitle
      artistName
      songTitleAlt
      artistNameAlt
      score
      date
      machineType
      notes
      genres
      issues
    }
  }
`;

export const DASHBOARD_STATS = gql`
  query DashboardStats {
    dashboardStats {
      totalReviews
      damAvgScore
      joysoundAvgScore
      sessionsThisMonth
      sessionsPrevMonth
      mostPracticed {
        songId
        title
        artistName
        count
      }
      commonIssues {
        issue
        count
      }
    }
  }
`;

export const IMPORT_DATA = gql`
  mutation ImportData($jsonData: String!) {
    importData(jsonData: $jsonData) {
      reviewsImported
      reviewsSkipped
      errors
    }
  }
`;

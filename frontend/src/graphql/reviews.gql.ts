import { gql } from "@apollo/client";

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

import { graphql } from "@/gql";

export const REVIEWS = graphql(`
  query Reviews($filter: ReviewFilter, $sort: ReviewSort, $limit: Int, $offset: Int) {
    reviews(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      totalCount
      items {
        ...ReviewWithSong
      }
    }
  }
`);

export const DASHBOARD = graphql(`
  query Dashboard {
    dashboardStats {
      totalReviews
      totalSongs
      totalArtists
      sessionsLast30Days
      sessionsPrev30Days
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
      machineStats {
        machineType
        reviewCount
        averageScore
        bestScore
      }
    }
  }
`);

export const LOG_REVIEW = graphql(`
  mutation LogReview($song: SongRefInput!, $review: ReviewInput!) {
    logReview(song: $song, review: $review) {
      ...ReviewWithSong
    }
  }
`);

export const UPDATE_REVIEW = graphql(`
  mutation UpdateReview($id: ID!, $input: ReviewInput!) {
    updateReview(id: $id, input: $input) {
      ...ReviewWithSong
    }
  }
`);

export const DELETE_REVIEWS = graphql(`
  mutation DeleteReviews($ids: [ID!]!) {
    deleteReviews(ids: $ids)
  }
`);

export const EXTRACT_REVIEW = graphql(`
  mutation ExtractReview($image: Upload!) {
    extractReviewFromImage(image: $image) {
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
      details {
        pitch
        stability
        rhythm
        expression
        techniques
        articulation
        totalPoints
        grade
      }
    }
  }
`);

import { graphql } from "@/gql";

export const USER_FIELDS = graphql(`
  fragment UserFields on User {
    id
    email
    emailVerified
    name
    defaultMachineType
    language
    createdAt
  }
`);

export const ARTIST_SUMMARY = graphql(`
  fragment ArtistSummary on Artist {
    id
    name
    isFavorite
    songCount
    reviewCount
  }
`);

export const SONG_SUMMARY = graphql(`
  fragment SongSummary on Song {
    id
    title
    genres
    youtubeUrl
    generatedYoutube
    isFavorite
    reviewCount
    artist {
      id
      name
    }
  }
`);

/** A take without its song (used inside song.reviews, where the song is the parent). */
export const REVIEW_CORE = graphql(`
  fragment ReviewCore on Review {
    id
    date
    score
    machineType
    keyChange
    variant
    issues
    notes
    isPersonalBest
    createdAt
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
`);

export const REVIEW_WITH_SONG = graphql(`
  fragment ReviewWithSong on Review {
    ...ReviewCore
    song {
      id
      title
      genres
      youtubeUrl
      artist {
        id
        name
      }
    }
  }
`);

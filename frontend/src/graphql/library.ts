import { graphql } from "@/gql";

export const SONGS = graphql(`
  query Songs($filter: SongFilter, $sort: SongSort, $limit: Int, $offset: Int) {
    songs(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      totalCount
      items {
        ...SongSummary
      }
    }
  }
`);

export const SONG = graphql(`
  query Song($id: ID!) {
    song(id: $id) {
      ...SongSummary
      goals {
        machineType
        targetScore
        bestScore
        achieved
      }
      reviews {
        ...ReviewCore
      }
    }
  }
`);

export const ARTISTS = graphql(`
  query Artists($filter: ArtistFilter, $sort: ArtistSort, $limit: Int, $offset: Int) {
    artists(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      totalCount
      items {
        ...ArtistSummary
      }
    }
  }
`);

export const ARTIST = graphql(`
  query Artist($id: ID!) {
    artist(id: $id) {
      ...ArtistSummary
      songs {
        ...SongSummary
      }
    }
  }
`);

/** Small list for the artist picker. */
export const ARTIST_OPTIONS = graphql(`
  query ArtistOptions($search: String) {
    artists(filter: { search: $search }, limit: 30) {
      items {
        id
        name
        songCount
      }
    }
  }
`);

export const ARTIST_SONG_OPTIONS = graphql(`
  query ArtistSongOptions($id: ID!) {
    artist(id: $id) {
      id
      songs {
        id
        title
        genres
        youtubeUrl
        generatedYoutube
      }
    }
  }
`);

export const FAVORITES = graphql(`
  query Favorites {
    myFavoriteSongs {
      ...SongSummary
    }
    myFavoriteArtists {
      ...ArtistSummary
    }
  }
`);

export const UPDATE_SONG = graphql(`
  mutation UpdateSong($id: ID!, $input: SongInput!) {
    updateSong(id: $id, input: $input) {
      ...SongSummary
    }
  }
`);

export const DELETE_SONG = graphql(`
  mutation DeleteSong($id: ID!) {
    deleteSong(id: $id)
  }
`);

export const SET_SONG_FAVORITE = graphql(`
  mutation SetSongFavorite($songId: ID!, $favorite: Boolean!) {
    setSongFavorite(songId: $songId, favorite: $favorite) {
      id
      isFavorite
    }
  }
`);

export const SET_SONG_GOAL = graphql(`
  mutation SetSongGoal($songId: ID!, $machineType: MachineType!, $targetScore: Float) {
    setSongGoal(songId: $songId, machineType: $machineType, targetScore: $targetScore) {
      id
      goals {
        machineType
        targetScore
        bestScore
        achieved
      }
    }
  }
`);

export const UPDATE_ARTIST = graphql(`
  mutation UpdateArtist($id: ID!, $name: String!) {
    updateArtist(id: $id, name: $name) {
      ...ArtistSummary
    }
  }
`);

export const MERGE_ARTISTS = graphql(`
  mutation MergeArtists($sourceId: ID!, $targetId: ID!) {
    mergeArtists(sourceId: $sourceId, targetId: $targetId) {
      ...ArtistSummary
    }
  }
`);

export const DELETE_ARTIST = graphql(`
  mutation DeleteArtist($id: ID!) {
    deleteArtist(id: $id)
  }
`);

export const SET_ARTIST_FAVORITE = graphql(`
  mutation SetArtistFavorite($artistId: ID!, $favorite: Boolean!) {
    setArtistFavorite(artistId: $artistId, favorite: $favorite) {
      id
      isFavorite
    }
  }
`);

export const SEARCH_YOUTUBE = graphql(`
  mutation SearchYoutube($artist: String!, $song: String!) {
    searchYoutube(artist: $artist, song: $song) {
      videoId
      title
      channelTitle
      duration
      thumbnailUrl
    }
  }
`);

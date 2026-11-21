import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { SET_ARTIST_FAVORITE, SET_SONG_FAVORITE } from "@/graphql/library";
import type { SetArtistFavoriteMutation, SetSongFavoriteMutation } from "@/gql/graphql";
import { trackEvent } from "@/lib/analytics";
import { errorMessage } from "@/lib/errors";

/**
 * Sets a favourite to an explicit value (idempotent on the server). The UI
 * updates immediately and is then corrected by the server's answer.
 */
export function useFavorite() {
  const { t } = useTranslation();
  const [setSong] = useMutation(SET_SONG_FAVORITE, { refetchQueries: ["Favorites"] });
  const [setArtist] = useMutation(SET_ARTIST_FAVORITE, { refetchQueries: ["Favorites"] });

  const song = (id: string, favorite: boolean) => {
    trackEvent({ name: "toggle_favorite", data: { type: "song" } });
    setSong({
      variables: { songId: id, favorite },
      optimisticResponse: {
        setSongFavorite: { __typename: "Song", id, isFavorite: favorite },
      } as SetSongFavoriteMutation,
    }).catch((e) => toast.error(errorMessage(e, t)));
  };
  const artist = (id: string, favorite: boolean) => {
    trackEvent({ name: "toggle_favorite", data: { type: "artist" } });
    setArtist({
      variables: { artistId: id, favorite },
      optimisticResponse: {
        setArtistFavorite: { __typename: "Artist", id, isFavorite: favorite },
      } as SetArtistFavoriteMutation,
    }).catch((e) => toast.error(errorMessage(e, t)));
  };
  return { song, artist };
}

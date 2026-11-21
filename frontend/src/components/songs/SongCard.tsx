import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import type { SongSummaryFragment } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FavoriteButton, GenreBadges, PlayButton } from "@/components/shared";

interface Props {
  song: SongSummaryFragment;
  onFavorite: (id: string, favorite: boolean) => void;
  onEdit: (song: SongSummaryFragment) => void;
}

function SongCard({ song, onFavorite, onEdit }: Props) {
  const { t } = useTranslation("songs");
  return (
    <Card className="relative">
      <div className="absolute top-3 right-3 flex gap-1">
        <PlayButton track={{ url: song.youtubeUrl, title: song.title, artist: song.artist.name }} />
        <FavoriteButton active={song.isFavorite} onToggle={(f) => onFavorite(song.id, f)} />
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onEdit(song)}
          aria-label={t("card.edit")}
          title={t("card.edit")}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <CardHeader className="pr-32">
        <CardTitle className="text-lg leading-snug">
          <Link to={`/songs/${song.id}`} className="hover:underline">
            {song.title}
          </Link>
        </CardTitle>
        <CardDescription>
          <Link to={`/artists/${song.artist.id}`} className="hover:underline">
            {song.artist.name}
          </Link>
          {" · "}
          {t("card.reviews", { count: song.reviewCount })}
        </CardDescription>
      </CardHeader>
      {song.genres.length > 0 && (
        <CardContent>
          <GenreBadges genres={song.genres} />
        </CardContent>
      )}
    </Card>
  );
}

export default memo(SongCard);

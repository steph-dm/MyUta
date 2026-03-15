import React from "react";
import { Link } from "react-router-dom";
import type { Song } from "../../types";
import { useTranslation } from "react-i18next";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Edit, Heart, Play } from "lucide-react";
import { getGenreColor } from "../../lib/utils";

export interface SongCardProps {
    song: Pick<Song, "id" | "title" | "genres" | "youtubeUrl" | "isFavorite">;
    artistName: string;
    artistId: string;
    activePlayerUrl?: string | null;
    onToggleFavorite?: () => void;
    onEdit?: () => void;
    onPlay?: (url: string, info: string) => void;
    onStop?: () => void;
}

const SongCard = ({
    song,
    artistName,
    artistId,
    activePlayerUrl,
    onToggleFavorite,
    onEdit,
    onPlay,
    onStop,
}: SongCardProps) => {
    const isPlaying = activePlayerUrl === song.youtubeUrl;
    const { t } = useTranslation("songs");

    return (
        <Card className="relative">
            <div className="absolute top-3 right-3 flex gap-1">
                {song.youtubeUrl && onPlay && onStop && (
                    <Button
                        variant={isPlaying ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                            if (isPlaying) {
                                onStop();
                            } else {
                                onPlay(song.youtubeUrl!, `${artistName} - ${song.title}`);
                            }
                        }}
                        title={isPlaying ? t("card.stop") : t("card.play")}
                        aria-label={isPlaying ? t("card.stop") : t("card.play")}
                    >
                        <Play className="h-4 w-4" />
                    </Button>
                )}
                {onToggleFavorite && (
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 ${song.isFavorite ? "text-red-500" : ""}`}
                        onClick={onToggleFavorite}
                        title={song.isFavorite ? t("card.removeFromFavorites") : t("card.addToFavorites")}
                        aria-label={song.isFavorite ? t("card.removeFromFavorites") : t("card.addToFavorites")}
                    >
                        <Heart className={`h-4 w-4 ${song.isFavorite ? "fill-current" : ""}`} />
                    </Button>
                )}
                {onEdit && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={onEdit}
                        title={t("card.editSong")}
                        aria-label={t("card.editSong")}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <CardHeader className="pr-20 sm:pr-28">
                <CardTitle className="text-lg">
                    <Link to={`/songs/${song.id}`} className="hover:underline transition-colors">
                        {song.title}
                    </Link>
                </CardTitle>
                <CardDescription>
                    <Link to={`/artists/${artistId}`} className="hover:underline transition-colors">
                        {artistName}
                    </Link>
                </CardDescription>
            </CardHeader>
            {song.genres.length > 0 && (
                <CardContent>
                    <div className="flex flex-wrap gap-1">
                        {song.genres.map((genre) => (
                            <Badge key={genre} variant="secondary" className={`text-xs ${getGenreColor(genre)}`}>
                                {t(`genreNames.${genre}`)}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default React.memo(SongCard);

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Heart, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

interface FavoriteSong {
    id: string;
    title: string;
    youtubeUrl?: string | null;
    artist: { id: string; name: string };
}

interface ProfileFavoritesProps {
    favorites: FavoriteSong[];
    activePlayerUrl: string | null;
    onTogglePlayer: (url: string, info: string) => void;
    onRemoveFavorite: (songId: string) => void;
}

const ProfileFavorites = ({
    favorites,
    activePlayerUrl,
    onTogglePlayer,
    onRemoveFavorite,
}: ProfileFavoritesProps) => {
    const { t } = useTranslation("profile");

    if (favorites.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5" /> {t("favorites")}
                </CardTitle>
                <CardDescription>
                    {t("favoriteSongsCount", { count: favorites.length })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {favorites.map((song) => (
                        <div
                            key={song.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                            <div className="min-w-0 flex-1">
                                <Link
                                    to={`/songs/${song.id}`}
                                    className="text-sm font-medium hover:underline truncate block"
                                >
                                    {song.title}
                                </Link>
                                <Link
                                    to={`/artists/${song.artist.id}`}
                                    className="text-xs text-muted-foreground truncate hover:underline transition-colors block"
                                >
                                    {song.artist.name}
                                </Link>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {song.youtubeUrl && (
                                    <Button
                                        variant={activePlayerUrl === song.youtubeUrl ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                            if (activePlayerUrl === song.youtubeUrl) {
                                                onTogglePlayer("", "");
                                            } else {
                                                onTogglePlayer(song.youtubeUrl!, `${song.artist.name} - ${song.title}`);
                                            }
                                        }}
                                        title={activePlayerUrl === song.youtubeUrl ? t("card.stop", { ns: "songs" }) : t("card.play", { ns: "songs" })}
                                        aria-label={activePlayerUrl === song.youtubeUrl ? t("card.stop", { ns: "songs" }) : t("card.play", { ns: "songs" })}
                                    >
                                        <Play className="h-3 w-3" />
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-500"
                                    onClick={() => onRemoveFavorite(song.id)}
                                    title={t("card.removeFromFavorites", { ns: "songs" })}
                                    aria-label={t("card.removeFromFavorites", { ns: "songs" })}
                                >
                                    <Heart className="h-3 w-3 fill-current" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default ProfileFavorites;

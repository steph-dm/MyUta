import { useTranslation } from "react-i18next";
import { BarChart3, Star, Music } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { getMachineBadgeColor } from "../../lib/utils";

interface Review {
    id: string;
    score: number;
    machineType: string;
    song: { id: string; artist: { id: string } };
}

interface ProfileStatsCardsProps {
    reviews: Review[];
    damReviews: Review[];
    joysoundReviews: Review[];
}

const avgScore = (arr: Review[]) =>
    arr.length > 0
        ? (arr.reduce((acc, r) => acc + r.score, 0) / arr.length).toFixed(3)
        : "N/A";

const ProfileStatsCards = ({ reviews, damReviews, joysoundReviews }: ProfileStatsCardsProps) => {
    const { t } = useTranslation("profile");

    const uniqueSongs = new Set(reviews.map((r) => r.song.id)).size;
    const uniqueArtists = new Set(reviews.map((r) => r.song.artist.id)).size;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" /> {t("stats.totalReviews")}
                    </CardDescription>
                    <CardTitle className="text-2xl">{reviews.length}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className={`${getMachineBadgeColor("DAM")} text-xs`}>
                            DAM {damReviews.length}
                        </Badge>
                        <Badge variant="secondary" className={`${getMachineBadgeColor("JOYSOUND")} text-xs`}>
                            JOY {joysoundReviews.length}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {damReviews.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Star className="h-3 w-3" /> {t("stats.averageScore")}
                            <Badge variant="secondary" className={`${getMachineBadgeColor("DAM")} text-xs px-2 py-0`}>
                                DAM
                            </Badge>
                        </CardDescription>
                        <CardTitle className="text-2xl">{avgScore(damReviews)}</CardTitle>
                    </CardHeader>
                </Card>
            )}

            {joysoundReviews.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Star className="h-3 w-3" /> {t("stats.averageScore")}
                            <Badge variant="secondary" className={`${getMachineBadgeColor("JOYSOUND")} text-xs px-2 py-0`}>
                                JOYSOUND
                            </Badge>
                        </CardDescription>
                        <CardTitle className="text-2xl">{avgScore(joysoundReviews)}</CardTitle>
                    </CardHeader>
                </Card>
            )}

            <Card>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                        <Music className="h-3 w-3" /> {t("stats.totalSongs")}
                    </CardDescription>
                    <CardTitle className="text-2xl">{uniqueSongs}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                        {t("stats.artistCount", { count: uniqueArtists })}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfileStatsCards;

import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import { GET_SONG_WITH_REVIEWS, TOGGLE_FAVORITE } from "../graphql";
import { trackEvent } from "../lib/analytics";
import { useTranslation } from "react-i18next";
import type { Genre, Review } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ArrowLeft, Calendar, Heart, Play } from "lucide-react";
import MaterialIcon from "../components/ui/MaterialIcon";
import EditReviewModal from "../components/reviews/EditReviewModal";
import FloatingPlayer from "../components/shared/FloatingPlayer";
import ScoreChart from "../components/charts/ScoreChart";
import MachineStatsGrid from "../components/songs/MachineStatsGrid";
import CollapsibleMachineSection from "../components/songs/CollapsibleMachineSection";
import {
  getGenreColor,
  getMachineBadgeColor,
  getMachineButtonColor,
} from "../lib/utils";
import { useState } from "react";
import { useFloatingPlayer } from "../hooks/useFloatingPlayer";

const SongDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("songs");
  const { t: tCommon } = useTranslation("common");
  const { t: tReviews } = useTranslation("reviews");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const { activePlayerUrl, activePlayerInfo, play, stop } =
    useFloatingPlayer();

  const { loading, error, data, refetch } = useQuery(GET_SONG_WITH_REVIEWS, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  const [toggleFavorite] = useMutation(TOGGLE_FAVORITE, {
    update(cache, _, { variables }) {
      cache.modify({
        id: cache.identify({ __typename: "Song", id: variables?.songId }),
        fields: { isFavorite: (prev: boolean) => !prev },
      });
    },
  });

  if (loading) return null;
  if (error) {
    return (
      <div className="text-red-600 py-8">
        {t("errors.loadFailed", { ns: "common" })}
      </div>
    );
  }
  if (!data?.songWithReviews) {
    return (
      <div className="text-muted-foreground py-8">{t("detail.notFound")}</div>
    );
  }

  const song = data.songWithReviews;
  const reviews: Review[] = song.reviews || [];
  const damReviews = reviews.filter((r: Review) => r.machineType === "DAM");
  const joysoundReviews = reviews.filter(
    (r: Review) => r.machineType === "JOYSOUND",
  );

  const machineSections = [
    {
      type: "DAM" as const,
      reviews: damReviews,
      badgeColor: getMachineBadgeColor("DAM"),
      buttonColor: getMachineButtonColor("DAM"),
      borderColor: "border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      type: "JOYSOUND" as const,
      reviews: joysoundReviews,
      badgeColor: getMachineBadgeColor("JOYSOUND"),
      buttonColor: getMachineButtonColor("JOYSOUND"),
      borderColor: "border-rose-200 dark:border-rose-800",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ].sort((a, b) => b.reviews.length - a.reviews.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/songs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("detail.backToSongs")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <MaterialIcon
              icon="music_note"
              size={28}
              className="text-primary shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xl sm:text-2xl leading-tight">
                  {song.title}
                </CardTitle>
                <div className="flex items-center gap-1 shrink-0">
                  {song.youtubeUrl && (
                    <Button
                      variant={
                        activePlayerUrl === song.youtubeUrl
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (activePlayerUrl === song.youtubeUrl) {
                          stop();
                        } else {
                          play(
                            song.youtubeUrl!,
                            `${song.artist.name} - ${song.title}`,
                          );
                        }
                      }}
                      title={
                        activePlayerUrl === song.youtubeUrl
                          ? tCommon("actions.stop")
                          : tCommon("actions.play")
                      }
                      aria-label={
                        activePlayerUrl === song.youtubeUrl
                          ? tCommon("actions.stop")
                          : tCommon("actions.play")
                      }
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 w-8 p-0 ${song.isFavorite ? "text-red-500" : ""}`}
                    onClick={() => {
                      toggleFavorite({ variables: { songId: song.id } });
                      trackEvent({
                        name: "toggle_favorite",
                        data: { type: "song" },
                      });
                    }}
                    title={
                      song.isFavorite
                        ? t("card.removeFromFavorites")
                        : t("card.addToFavorites")
                    }
                    aria-label={
                      song.isFavorite
                        ? t("card.removeFromFavorites")
                        : t("card.addToFavorites")
                    }
                  >
                    <Heart
                      className={`h-4 w-4 ${song.isFavorite ? "fill-current" : ""}`}
                    />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-sm sm:text-base mt-1">
                {t("detail.by")}{" "}
                <Link
                  to={`/artists/${song.artist.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {song.artist.name}
                </Link>
              </CardDescription>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {song.genres.map((genre: Genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className={`text-xs ${getGenreColor(genre)}`}
                  >
                    {t(`genreNames.${genre}`)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {reviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {tReviews("reviewCount", { count: reviews.length })}
            </span>
          </div>

          {machineSections
            .filter((s) => s.reviews.length > 0)
            .map((section) => (
              <div key={section.type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={section.buttonColor}>
                    {section.type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {tReviews("reviewCount", {
                      count: section.reviews.length,
                    })}
                  </span>
                </div>
                <MachineStatsGrid
                  reviews={section.reviews}
                  iconColor={section.iconColor}
                />
              </div>
            ))}
        </div>
      )}

      {machineSections
        .filter((section) => section.reviews.length > 1)
        .map((section) => (
          <Card key={`${section.type}-chart`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  {t("detail.scoreTimeline")}
                </CardTitle>
                <Badge className={section.badgeColor}>{section.type}</Badge>
              </div>
              <CardDescription>{t("detail.scoreOverTime")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreChart
                machineType={section.type}
                reviews={section.reviews}
              />
            </CardContent>
          </Card>
        ))}

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.performanceHistory")}</CardTitle>
          <CardDescription>
            {reviews.length === 0
              ? t("detail.noReviewsYet")
              : t("detail.reviewsRecorded", { count: reviews.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {machineSections.map((section) => (
            <CollapsibleMachineSection
              key={section.type}
              type={section.type}
              reviews={section.reviews}
              badgeColor={section.badgeColor}
              borderColor={section.borderColor}
              onEditReview={(review) => setEditingReview(review)}
              onReviewDeleted={() => refetch()}
            />
          ))}
        </CardContent>
      </Card>

      <EditReviewModal
        isOpen={!!editingReview}
        onClose={() => setEditingReview(null)}
        onReviewUpdated={() => refetch()}
        review={editingReview}
      />

      {activePlayerUrl && (
        <FloatingPlayer
          url={activePlayerUrl}
          songInfo={activePlayerInfo}
          onClose={stop}
        />
      )}
    </div>
  );
};

export default SongDetail;

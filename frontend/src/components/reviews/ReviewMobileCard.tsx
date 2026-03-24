import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Review } from "../../types";
import { generateScoreCard } from "../../lib/generateScoreCard";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover";
import {
    Edit,
    MessageCircleQuestion,
    Play,
    Share2,
} from "lucide-react";
import { cn, formatDateYYYYMMDD, getIssueColor } from "../../lib/utils";
import DeleteReviewDialog from "./DeleteReviewDialog";
import { useAuth } from "../../contexts/AuthContext";

interface ReviewMobileCardProps {
    review: Review;
    isSelected: boolean;
    showActions: boolean;
    activePlayerUrl: string | null;
    onPlay: (url: string, info: string) => void;
    onStop: () => void;
    onEditReview?: (review: Review) => void;
    onDeleteReview?: (reviewId: string) => void;
}

const getScoreVariant = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 80) return "secondary";
    if (score >= 70) return "outline";
    return "destructive";
};

const ReviewMobileCard = ({
    review,
    isSelected,
    showActions,
    activePlayerUrl,
    onPlay,
    onStop,
    onEditReview,
    onDeleteReview,
}: ReviewMobileCardProps) => {
    const { t } = useTranslation("reviews");
    const { user: currentUser } = useAuth();

    return (
        <div
            className={cn(
                "rounded-lg border p-3 space-y-2",
                isSelected ? "bg-muted/50" : "",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <Link
                        to={`/songs/${review.song.id}`}
                        className="font-medium hover:underline transition-colors line-clamp-1"
                    >
                        {review.song.title}
                    </Link>
                    <Link
                        to={`/artists/${review.song.artist.id}`}
                        className="text-sm text-muted-foreground truncate hover:underline transition-colors"
                    >
                        {review.song.artist.name}
                    </Link>
                </div>
                <Badge variant={getScoreVariant(review.score)} className="shrink-0">
                    {review.score.toFixed(3)}
                </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                    {formatDateYYYYMMDD(review.date)}
                </span>
                <div className="flex items-center gap-1.5">
                    {review.notes && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="hover:bg-muted rounded-md p-1 transition-colors" aria-label={t("table.viewNotes")}>
                                    <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-72 bg-popover shadow-[0_4px_24px_rgba(0,0,0,0.18)] border"
                                side="top"
                                align="end"
                            >
                                <p className="text-sm whitespace-pre-wrap">{review.notes}</p>
                            </PopoverContent>
                        </Popover>
                    )}
                    {review.song.youtubeUrl && (
                        <Button
                            variant={activePlayerUrl === review.song.youtubeUrl ? "default" : "outline"}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                                if (activePlayerUrl === review.song.youtubeUrl) {
                                    onStop();
                                } else {
                                    onPlay(
                                        review.song.youtubeUrl!,
                                        `${review.song.artist.name} - ${review.song.title}`,
                                    );
                                }
                            }}
                            aria-label={activePlayerUrl === review.song.youtubeUrl ? t("table.stopAudio") : t("table.playAudio")}
                        >
                            <Play className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const genreLabels = Object.fromEntries(review.song.genres.map(g => [g, t(`genreNames.${g}`, { ns: "songs" })]));
                            generateScoreCard(review, currentUser ? { name: currentUser.name, email: currentUser.email } : undefined, genreLabels);
                        }}
                        className="h-7 w-7 p-0"
                        title={t("shareScoreCard")}
                        aria-label={t("shareScoreCard")}
                    >
                        <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    {showActions && (
                        <>
                            {onEditReview && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEditReview(review)}
                                    className="h-7 w-7 p-0"
                                    aria-label={t("table.editReview")}
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {onDeleteReview && (
                                <DeleteReviewDialog
                                    reviewId={review.id}
                                    songTitle={review.song.title}
                                    artistName={review.song.artist.name}
                                    onConfirm={onDeleteReview}
                                    buttonSize="sm"
                                    buttonClassName="h-7 w-7 p-0 text-destructive"
                                    iconClassName="h-3.5 w-3.5"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
            {review.issues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {[...review.issues].sort((a, b) =>
                        t(`issues.${a}`).localeCompare(t(`issues.${b}`))
                    ).map((issue) => (
                        <Badge
                            key={issue}
                            variant="outline"
                            className={cn("text-xs", getIssueColor(issue))}
                        >
                            {t(`issues.${issue}`)}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewMobileCard;

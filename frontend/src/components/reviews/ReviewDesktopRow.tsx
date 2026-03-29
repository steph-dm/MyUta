import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Review } from "../../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { TableCell, TableRow } from "../ui/table";
import { Edit, MessageCircleQuestion, Play, Share2 } from "lucide-react";
import { cn, formatDateYYYYMMDD, getIssueColor } from "../../lib/utils";
import { generateScoreCard } from "../../lib/generateScoreCard";
import DeleteReviewDialog from "./DeleteReviewDialog";
import { useAuth } from "../../contexts/AuthContext";

interface ReviewDesktopRowProps {
  review: Review;
  isSelected: boolean;
  showCheckboxes: boolean;
  showActions: boolean;
  activePlayerUrl: string | null;
  hoveredNoteId: string | null;
  hoveredIssuesId: string | null;
  onToggleSelect: (id: string) => void;
  onSetHoveredNoteId: (id: string | null) => void;
  onSetHoveredIssuesId: (id: string | null) => void;
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

const ReviewDesktopRow = ({
  review,
  isSelected,
  showCheckboxes,
  showActions,
  activePlayerUrl,
  hoveredNoteId,
  hoveredIssuesId,
  onToggleSelect,
  onSetHoveredNoteId,
  onSetHoveredIssuesId,
  onPlay,
  onStop,
  onEditReview,
  onDeleteReview,
}: ReviewDesktopRowProps) => {
  const { t } = useTranslation("reviews");
  const { user: currentUser } = useAuth();

  return (
    <TableRow className={isSelected ? "bg-muted/50" : ""}>
      {showCheckboxes && (
        <TableCell>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(review.id)}
            className="rounded border-border"
          />
        </TableCell>
      )}
      <TableCell className="font-medium">
        {formatDateYYYYMMDD(review.date)}
      </TableCell>
      <TableCell className="font-medium truncate">
        <Link
          to={`/artists/${review.song.artist.id}`}
          className="hover:underline transition-colors"
        >
          {review.song.artist.name}
        </Link>
      </TableCell>
      <TableCell className="font-medium truncate">
        <Link
          to={`/songs/${review.song.id}`}
          className="hover:underline transition-colors"
        >
          {review.song.title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant={getScoreVariant(review.score)}>
          {review.score.toFixed(3)}
        </Badge>
      </TableCell>
      <TableCell>
        {review.issues.length === 0 ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          (() => {
            const sortedIssues = [...review.issues].sort((a, b) =>
              t(`issues.${a}`).localeCompare(t(`issues.${b}`)),
            );
            return (
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getIssueColor(sortedIssues[0]))}
                >
                  {t(`issues.${sortedIssues[0]}`)}
                </Badge>
                {sortedIssues.length > 1 && (
                  <Popover
                    open={hoveredIssuesId === review.id}
                    onOpenChange={(open) => {
                      if (!open) onSetHoveredIssuesId(null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className="hover:bg-muted rounded-md px-1.5 py-0.5 text-xs text-muted-foreground border transition-colors"
                        onMouseEnter={() => onSetHoveredIssuesId(review.id)}
                        onMouseLeave={() => onSetHoveredIssuesId(null)}
                        aria-label={t("table.moreIssues", {
                          count: sortedIssues.length - 1,
                        })}
                      >
                        +{sortedIssues.length - 1}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto max-w-64 bg-popover shadow-[0_4px_24px_rgba(0,0,0,0.18)] border p-2"
                      side="top"
                      align="center"
                      onMouseEnter={() => onSetHoveredIssuesId(review.id)}
                      onMouseLeave={() => onSetHoveredIssuesId(null)}
                    >
                      <div className="flex flex-wrap gap-1">
                        {sortedIssues.map((issue) => (
                          <Badge
                            key={issue}
                            variant="outline"
                            className={cn("text-xs", getIssueColor(issue))}
                          >
                            {t(`issues.${issue}`)}
                          </Badge>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })()
        )}
      </TableCell>
      <TableCell>
        {review.notes ? (
          <Popover
            open={hoveredNoteId === review.id}
            onOpenChange={(open) => {
              if (!open) onSetHoveredNoteId(null);
            }}
          >
            <PopoverTrigger asChild>
              <button
                className="hover:bg-muted rounded-md p-1 transition-colors"
                onMouseEnter={() => onSetHoveredNoteId(review.id)}
                onMouseLeave={() => onSetHoveredNoteId(null)}
                aria-label={t("table.viewNotes")}
              >
                <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 bg-popover shadow-[0_4px_24px_rgba(0,0,0,0.18)] border"
              side="top"
              align="center"
              onMouseEnter={() => onSetHoveredNoteId(review.id)}
              onMouseLeave={() => onSetHoveredNoteId(null)}
            >
              <p className="text-sm whitespace-pre-wrap">{review.notes}</p>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {review.song.youtubeUrl ? (
          <Button
            variant={
              activePlayerUrl === review.song.youtubeUrl ? "default" : "outline"
            }
            size="sm"
            className="h-8 w-8 p-0"
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
            aria-label={
              activePlayerUrl === review.song.youtubeUrl
                ? t("table.stopAudio")
                : t("table.playAudio")
            }
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      {showActions && (
        <TableCell>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const genreLabels = Object.fromEntries(
                  review.song.genres.map((g) => [
                    g,
                    t(`genreNames.${g}`, { ns: "songs" }),
                  ]),
                );
                generateScoreCard(
                  review,
                  currentUser
                    ? { name: currentUser.name, email: currentUser.email }
                    : undefined,
                  genreLabels,
                );
              }}
              className="h-8 w-8 p-0"
              title={t("shareScoreCard")}
              aria-label={t("shareScoreCard")}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {onEditReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditReview(review)}
                className="h-8 w-8 p-0"
                aria-label={t("table.editReview")}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDeleteReview && (
              <DeleteReviewDialog
                reviewId={review.id}
                songTitle={review.song.title}
                artistName={review.song.artist.name}
                onConfirm={onDeleteReview}
              />
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};

export default ReviewDesktopRow;

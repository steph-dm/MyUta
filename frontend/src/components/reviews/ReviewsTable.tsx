import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import type { Review } from "../../types";
import { DELETE_REVIEW, DELETE_REVIEWS } from "../../graphql/queries";
import { trackEvent } from "../../lib/analytics";

import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import FloatingPlayer from "../shared/FloatingPlayer";
import ReviewsToolbar from "./ReviewsToolbar";
import ReviewMobileCard from "./ReviewMobileCard";
import ReviewDesktopRow from "./ReviewDesktopRow";
import ReviewsPagination from "./ReviewsPagination";
import { useReviewFilters } from "../../hooks/useReviewFilters";

interface ReviewsTableProps {
  reviews: Review[];
  onEditReview?: (review: Review) => void;
  onReviewDeleted?: () => void;
  showActions?: boolean;
}

const ITEMS_PER_PAGE = 5;

const ReviewsTable = ({
  reviews,
  onEditReview,
  onReviewDeleted,
  showActions = true,
}: ReviewsTableProps) => {
  const { t } = useTranslation("reviews");
  const filters = useReviewFilters(reviews, t);

  const [activePlayerUrl, setActivePlayerUrl] = useState<string | null>(null);
  const [activePlayerInfo, setActivePlayerInfo] = useState("");

  const [deleteReview] = useMutation(DELETE_REVIEW, {
    onCompleted: () => {
      trackEvent({ name: "delete_review" });
      toast.success(t("toast.deleted"));
      onReviewDeleted?.();
    },
    onError: () => toast.error(t("toast.deleteFailed")),
  });

  const [deleteReviewsBatch] = useMutation(DELETE_REVIEWS, {
    onCompleted: (data) => {
      const count = data?.deleteReviews ?? 0;
      trackEvent({ name: "delete_reviews_bulk", data: { count } });
      toast.success(t("toast.bulkDeleted", { count }));
      filters.setSelectedIds(new Set());
      onReviewDeleted?.();
    },
    onError: () => toast.error(t("toast.deleteFailed")),
  });

  const handleDelete = (reviewId: string) => {
    deleteReview({ variables: { id: reviewId } });
  };

  const handleDeleteSelected = () => {
    if (filters.selectedIds.size === 0) return;
    deleteReviewsBatch({
      variables: { ids: Array.from(filters.selectedIds) },
    });
  };

  const onPlay = (url: string, info: string) => {
    setActivePlayerUrl(url);
    setActivePlayerInfo(info);
  };

  const onStop = () => setActivePlayerUrl(null);

  const showCheckboxes = showActions && !!onReviewDeleted;

  return (
    <>
      <div>
        {showActions && filters.selectedIds.size > 0 && (
          <div className="flex items-center flex-wrap gap-2 mb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("table.deleteSelected")} ({filters.selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("deleteDialog.bulkTitle", {
                      count: filters.selectedIds.size,
                    })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteDialog.bulkDescription", {
                      count: filters.selectedIds.size,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("deleteDialog.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSelected}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("deleteDialog.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        <div className="space-y-4">
          <ReviewsToolbar filters={filters} totalReviews={reviews.length} />

          {/* Mobile view */}
          <div className="md:hidden space-y-2">
            {filters.paginatedReviews.map((review) => (
              <ReviewMobileCard
                key={review.id}
                review={review}
                isSelected={filters.selectedIds.has(review.id)}
                showActions={showActions}
                activePlayerUrl={activePlayerUrl}
                onPlay={onPlay}
                onStop={onStop}
                onEditReview={onEditReview}
                onDeleteReview={onReviewDeleted ? handleDelete : undefined}
              />
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {showCheckboxes && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={filters.allPageSelected}
                        onChange={filters.toggleSelectAll}
                        className="rounded border-border"
                      />
                    </TableHead>
                  )}
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.artist")}</TableHead>
                  <TableHead>{t("table.song")}</TableHead>
                  <TableHead>{t("table.score")}</TableHead>
                  <TableHead>{t("table.issues")}</TableHead>
                  <TableHead>{t("table.notes")}</TableHead>
                  <TableHead>{t("table.youtube")}</TableHead>
                  {showActions && <TableHead>{t("table.actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filters.paginatedReviews.map((review) => (
                  <ReviewDesktopRow
                    key={review.id}
                    review={review}
                    isSelected={filters.selectedIds.has(review.id)}
                    showCheckboxes={showCheckboxes}
                    showActions={showActions}
                    activePlayerUrl={activePlayerUrl}
                    hoveredNoteId={filters.hoveredNoteId}
                    hoveredIssuesId={filters.hoveredIssuesId}
                    onToggleSelect={filters.toggleSelect}
                    onSetHoveredNoteId={filters.setHoveredNoteId}
                    onSetHoveredIssuesId={filters.setHoveredIssuesId}
                    onPlay={onPlay}
                    onStop={onStop}
                    onEditReview={onEditReview}
                    onDeleteReview={onReviewDeleted ? handleDelete : undefined}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {filters.filteredReviews.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {filters.hasActiveFilters
                ? t("table.noMatchingReviews")
                : t("table.noReviews")}
            </p>
          )}

          <ReviewsPagination
            currentPage={filters.safeCurrentPage}
            totalPages={filters.totalPages}
            totalItems={filters.filteredReviews.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={filters.setCurrentPage}
          />
        </div>
      </div>

      {activePlayerUrl && (
        <FloatingPlayer
          url={activePlayerUrl}
          songInfo={activePlayerInfo}
          onClose={onStop}
        />
      )}
    </>
  );
};

export default ReviewsTable;

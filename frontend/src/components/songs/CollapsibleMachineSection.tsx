import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Review } from "../../types";
import { Badge } from "../ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import ReviewsTable from "../reviews/ReviewsTable";

interface CollapsibleMachineSectionProps {
  type: string;
  reviews: Review[];
  badgeColor: string;
  borderColor: string;
  onEditReview: (review: Review) => void;
  onReviewDeleted: () => void;
}

const CollapsibleMachineSection = ({
  type,
  reviews,
  badgeColor,
  borderColor,
  onEditReview,
  onReviewDeleted,
}: CollapsibleMachineSectionProps) => {
  const { t: tReviews } = useTranslation("reviews");
  const { t } = useTranslation("songs");
  const [collapsed, setCollapsed] = useState(reviews.length === 0);

  return (
    <div className={`border rounded-lg ${borderColor}`}>
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
          <Badge
            variant="secondary"
            className={`${badgeColor} text-sm px-3 py-1`}
          >
            {type}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {reviews.length === 0
              ? t("detail.noReviews")
              : tReviews("reviewCount", { count: reviews.length })}
          </span>
        </div>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4">
          <ReviewsTable
            reviews={reviews}
            onEditReview={onEditReview}
            onReviewDeleted={onReviewDeleted}
          />
        </div>
      )}
    </div>
  );
};

export default CollapsibleMachineSection;

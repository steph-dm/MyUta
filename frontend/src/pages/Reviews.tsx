import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { GET_MY_REVIEWS } from "../graphql/queries";
import type { Review } from "../types";
import ReviewsTable from "../components/reviews/ReviewsTable";
import AddReviewModal from "../components/reviews/AddReviewModal";
import EditReviewModal from "../components/reviews/EditReviewModal";

import { TableSkeleton } from "../components/shared/Skeletons";
import { SectionErrorBoundary } from "../components/shared/ErrorBoundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getMachineBadgeColor } from "../lib/utils";

const Reviews = () => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation("reviews");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});


  const { loading, error, data, refetch } = useQuery(GET_MY_REVIEWS, {
    variables: { userId: currentUser?.id },
    skip: !currentUser?.id,
    fetchPolicy: "cache-and-network",
  });



  if (!currentUser) {
    return null;
  }

  if (loading)
    return <div className="space-y-6"><TableSkeleton rows={8} /></div>;
  if (error)
    return <div className="text-red-600 py-8">{error.message}</div>;

  const { myReviews } = data;

  const damReviews = myReviews.filter((r: Review) => r.machineType === "DAM");
  const joysoundReviews = myReviews.filter(
    (r: Review) => r.machineType === "JOYSOUND",
  );

  const sections = [
    {
      type: "DAM" as const,
      reviews: damReviews,
      color: getMachineBadgeColor("DAM"),
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      type: "JOYSOUND" as const,
      reviews: joysoundReviews,
      color: getMachineBadgeColor("JOYSOUND"),
      borderColor: "border-rose-200 dark:border-rose-800",
    },
  ].sort((a, b) => b.reviews.length - a.reviews.length);

  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleReviewAdded = () => {
    refetch();
    setIsAddModalOpen(false);
  };

  const handleReviewUpdated = () => {
    refetch();
    setIsEditModalOpen(false);
    setEditingReview(null);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setIsEditModalOpen(true);
  };



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>
                {t("allReviews")} (
                {myReviews.length === 0
                  ? t("noReviews")
                  : t("reviewCount", { count: myReviews.length })}
                )
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("addReview")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map(({ type, reviews, color, borderColor }) => (
            <SectionErrorBoundary key={type}>
            <div className={`border rounded-lg ${borderColor}`}>
              <button
                onClick={() => toggleSection(type)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                aria-expanded={!(collapsedSections[type] ?? reviews.length === 0)}
              >
                <div className="flex items-center gap-3">
                  {(collapsedSections[type] ?? reviews.length === 0) ? (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Badge
                    variant="secondary"
                    className={`${color} text-sm px-3 py-1`}
                  >
                    {type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {reviews.length === 0
                      ? t("noReviews")
                      : t("reviewCount", { count: reviews.length })}
                  </span>
                </div>
              </button>
              {!(collapsedSections[type] ?? reviews.length === 0) && (
                <div className="px-4 pb-4">
                  <ReviewsTable
                    reviews={reviews}
                    onEditReview={handleEditReview}
                    onReviewDeleted={() => refetch()}
                  />
                </div>
              )}
            </div>
            </SectionErrorBoundary>
          ))}
        </CardContent>
      </Card>

      <AddReviewModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onReviewAdded={handleReviewAdded}
        userId={currentUser.id}
      />

      <EditReviewModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingReview(null);
        }}
        onReviewUpdated={handleReviewUpdated}
        review={editingReview}
      />


    </div>
  );
};

export default Reviews;

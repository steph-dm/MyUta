import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReviewsPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

const ReviewsPagination = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
}: ReviewsPaginationProps) => {
    const { t } = useTranslation("reviews");

    if (totalItems <= itemsPerPage) return null;

    const from = (currentPage - 1) * itemsPerPage + 1;
    const to = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
                {t("table.showing", { from, to, total: totalItems })}
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label={t("table.previousPage")}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 text-muted-foreground">
                    {currentPage} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label={t("table.nextPage")}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default ReviewsPagination;

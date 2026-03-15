import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
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
} from "../../components/ui/alert-dialog";

interface DeleteReviewDialogProps {
    reviewId: string;
    songTitle: string;
    artistName: string;
    onConfirm: (reviewId: string) => void;
    buttonSize?: "sm" | "default";
    buttonClassName?: string;
    iconClassName?: string;
}

const DeleteReviewDialog = ({
    reviewId,
    songTitle,
    artistName,
    onConfirm,
    buttonSize = "sm",
    buttonClassName = "h-8 w-8 p-0 text-destructive",
    iconClassName = "h-4 w-4",
}: DeleteReviewDialogProps) => {
    const { t } = useTranslation("reviews");

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size={buttonSize}
                    className={buttonClassName}
                >
                    <Trash2 className={iconClassName} />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteDialog.description", { song: songTitle, artist: artistName })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => onConfirm(reviewId)}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {t("deleteDialog.delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteReviewDialog;

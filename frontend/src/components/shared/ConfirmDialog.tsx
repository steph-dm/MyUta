import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog(p: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={p.open} onOpenChange={p.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{p.title}</AlertDialogTitle>
          <AlertDialogDescription>{p.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {p.children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={p.busy}>
            {p.cancelLabel ?? t("actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={p.busy}
            className={cn(p.destructive && buttonVariants({ variant: "destructive" }))}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the action finishes
              p.onConfirm();
            }}
          >
            {p.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

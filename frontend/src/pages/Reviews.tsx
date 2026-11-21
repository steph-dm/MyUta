import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { DASHBOARD } from "@/graphql/reviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MachineSection } from "@/components/shared";
import ReviewsTable from "@/components/reviews/ReviewsTable";
import LogReviewDialog from "@/components/reviews/LogReviewDialog";
import { MACHINES, MACHINE_TYPES } from "@/lib/machines";
import { shareProblem, takeSharedImage } from "@/lib/shareTarget";

export default function Reviews() {
  const { t } = useTranslation("reviews");
  const [logOpen, setLogOpen] = useState(false);
  const [sharedImage, setSharedImage] = useState<File | null>(null);
  const [params, setParams] = useSearchParams();
  const shareParam = params.get("share");
  const handledShare = useRef<string | null>(null);
  const { data } = useQuery(DASHBOARD);

  // Opened from the Android Share menu (see public/sw.js): attach the shared photo to
  // "Log a take". The parameter is removed so reloading does not repeat it.
  useEffect(() => {
    if (!shareParam || handledShare.current === shareParam) return;
    handledShare.current = shareParam;
    const clear = () =>
      setParams(
        (p) => {
          p.delete("share");
          return p;
        },
        { replace: true },
      );
    const problem = shareProblem(shareParam);
    if (problem) {
      toast.error(t(`share.${problem}`));
      clear();
      return;
    }
    takeSharedImage(shareParam)
      .then((file) => {
        if (!file) {
          toast.error(t("share.expired"));
          return;
        }
        setSharedImage(file);
        setLogOpen(true);
      })
      .catch(() => toast.error(t("share.error")))
      .finally(clear);
  }, [shareParam, setParams, t]);
  const counts = new Map(
    (data?.dashboardStats.machineStats ?? []).map((m) => [m.machineType, m.reviewCount]),
  );
  const total = data?.dashboardStats.totalReviews;
  const machines = [...MACHINE_TYPES].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle as="h1">{t("title")}</CardTitle>
          <CardDescription>
            {total !== undefined ? t("count", { count: total }) : t("description")}
          </CardDescription>
        </div>
        <Button onClick={() => setLogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("add")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {machines.map((m) => {
          const count = counts.get(m) ?? 0;
          return (
            <MachineSection
              key={m}
              type={m}
              count={count}
              countLabel={count ? t("count", { count }) : t("none")}
            >
              <ReviewsTable
                filter={{ machineType: m }}
                caption={t("table.caption", { machine: MACHINES[m].label })}
              />
            </MachineSection>
          );
        })}
      </CardContent>
      <LogReviewDialog
        open={logOpen}
        onOpenChange={(o) => {
          setLogOpen(o);
          if (!o) setSharedImage(null);
        }}
        initialImage={sharedImage}
      />
    </Card>
  );
}

import { useId, useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Target, Trophy, X } from "lucide-react";
import { SET_SONG_GOAL } from "@/graphql/library";
import type { MachineType } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent } from "@/lib/analytics";
import { errorMessage } from "@/lib/errors";
import { MACHINES } from "@/lib/machines";

interface Goal {
  targetScore: number;
  bestScore?: number | null;
  achieved: boolean;
}

/** Shows and edits the goal of one song on one machine. */
export default function GoalEditor({
  songId,
  machine,
  goal,
}: {
  songId: string;
  machine: MachineType;
  goal?: Goal;
}) {
  const { t } = useTranslation("songs");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(goal ? String(goal.targetScore) : "");
  const [save, { loading }] = useMutation(SET_SONG_GOAL);

  const submit = async (target: number | null) => {
    try {
      await save({ variables: { songId, machineType: machine, targetScore: target } });
      trackEvent({ name: "set_goal" });
      setOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  const pct = goal && goal.bestScore ? Math.min(100, (goal.bestScore / goal.targetScore) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {goal ? (
        <>
          {goal.achieved ? (
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
          ) : (
            <Target className={`h-4 w-4 ${MACHINES[machine].accent}`} aria-hidden="true" />
          )}
          <span>
            {goal.achieved
              ? t("goal.achieved")
              : t("goal.progress", {
                  best: goal.bestScore?.toFixed(3) ?? "–",
                  target: goal.targetScore.toFixed(3),
                })}
          </span>
          <div
            className="h-2 w-24 rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-label={t("goal.title")}
          >
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : (
        <span className="text-muted-foreground">{t("goal.none")}</span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7">
            {t("goal.set")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(value);
              if (Number.isFinite(n) && n > 0 && n <= 100) void submit(n);
            }}
            className="space-y-2"
          >
            <Label htmlFor={`${id}-target`}>
              {t("goal.target", { machine: MACHINES[machine].label })}
            </Label>
            <Input
              id={`${id}-target`}
              type="number"
              min={0.001}
              max={100}
              step={0.001}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="flex justify-between gap-2">
              {goal && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void submit(null)}
                  disabled={loading}
                  className="gap-1"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  {t("goal.remove")}
                </Button>
              )}
              <Button type="submit" size="sm" disabled={loading} className="ml-auto">
                {t("common:actions.save")}
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}

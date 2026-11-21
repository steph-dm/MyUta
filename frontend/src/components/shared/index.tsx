/* Small shared components used across pages. */
import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { useTranslation, withTranslation, type WithTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Heart,
  Pause,
  Play,
  Trophy,
  X,
} from "lucide-react";
import type { Genre, Issue, MachineType } from "@/gql/graphql";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { GENRES, ISSUES, genreColor, issueColor } from "@/lib/constants";
import { BAND_BADGE, MACHINES, MACHINE_TYPES, scoreBand } from "@/lib/machines";
import { cn, PAGE_SIZES } from "@/lib/utils";
import { usePlayer } from "@/contexts/PlayerContext";
import { intlLocale } from "@/i18n";
import { videoId } from "@/lib/youtube";

// --- states ---------------------------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/40 mb-4" aria-hidden="true" />
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Error message with a retry button. */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message ?? t("errors.loadFailed")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("actions.retry")}
        </Button>
      )}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// --- error boundary ---------------------------------------------------------------------------

interface BoundaryProps extends WithTranslation {
  children: ReactNode;
  compact?: boolean;
}

class Boundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }
  render() {
    const { t, compact, children } = this.props;
    if (!this.state.error) return children;
    return (
      <div
        role="alert"
        className={cn(
          "flex items-center gap-3 text-center",
          compact
            ? "rounded-lg border border-destructive/20 bg-destructive/5 p-4"
            : "flex-col justify-center py-16",
        )}
      >
        <AlertTriangle
          className={compact ? "h-5 w-5 text-destructive" : "h-12 w-12 text-destructive"}
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">{t("common:errors.unexpected")}</p>
        <Button variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
          {t("common:actions.retry")}
        </Button>
      </div>
    );
  }
}

/** Translations come from the hook HOC, so they follow language changes. */
export const ErrorBoundary = withTranslation()(Boundary);

// --- badges --------------------------------------------------------------------------------------

export function MachineBadge({ type, className }: { type: MachineType; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(MACHINES[type].badge, className)}>
      {MACHINES[type].label}
    </Badge>
  );
}

export function ScoreBadge({
  score,
  machine,
  personalBest,
}: {
  score: number;
  machine: MachineType;
  personalBest?: boolean;
}) {
  const { t } = useTranslation("reviews");
  return (
    <span className="inline-flex items-center gap-1">
      <Badge
        variant="secondary"
        className={cn("tabular-nums", BAND_BADGE[scoreBand(score, machine)])}
      >
        {score.toFixed(3)}
      </Badge>
      {personalBest && (
        <span title={t("personalBest")} className="inline-flex items-center text-amber-500">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{t("personalBest")}</span>
        </span>
      )}
    </span>
  );
}

export function GenreBadges({ genres }: { genres: readonly Genre[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1">
      {genres.map((g) => (
        <Badge key={g} variant="secondary" className={cn("text-xs", genreColor(g))}>
          {t(`genres.${g}`)}
        </Badge>
      ))}
    </div>
  );
}

export function IssueBadges({ issues }: { issues: readonly Issue[] }) {
  const { t } = useTranslation();
  const sorted = [...issues].sort((a, b) =>
    t(`issues.${a}`).localeCompare(t(`issues.${b}`), intlLocale()),
  );
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((i) => (
        <Badge key={i} variant="outline" className={cn("text-xs", issueColor(i))}>
          {t(`issues.${i}`)}
        </Badge>
      ))}
    </div>
  );
}

// --- pickers -------------------------------------------------------------------------------------

interface MultiPickerProps<T extends string> {
  id?: string;
  values: readonly T[];
  options: readonly T[];
  onChange: (values: T[]) => void;
  label: (v: T) => string;
  color: (v: T) => string;
  placeholder: string;
  selectedLabel: (count: number) => string;
  searchPlaceholder: string;
  emptyText: string;
  invalid?: boolean;
  describedBy?: string;
}

/** Multi-select with search; selected values are shown as removable badges. */
export function MultiPicker<T extends string>(p: MultiPickerProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggle = (v: T) =>
    p.onChange(p.values.includes(v) ? p.values.filter((x) => x !== v) : [...p.values, v]);
  const sorted = [...p.options].sort((a, b) => p.label(a).localeCompare(p.label(b), intlLocale()));
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={p.id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={p.invalid || undefined}
            aria-describedby={p.describedBy}
            className={cn("w-full justify-between font-normal", p.invalid && "border-destructive")}
          >
            {p.values.length === 0 ? p.placeholder : p.selectedLabel(p.values.length)}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={p.searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{p.emptyText}</CommandEmpty>
              <CommandGroup>
                {sorted.map((v) => (
                  <CommandItem key={v} value={p.label(v)} onSelect={() => toggle(v)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        p.values.includes(v) ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                    {p.label(v)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {p.values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.values.map((v) => (
            <Badge key={v} variant="outline" className={cn("text-xs gap-1 pr-1", p.color(v))}>
              {p.label(v)}
              <button
                type="button"
                onClick={() => toggle(v)}
                className="rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={t("actions.remove", { name: p.label(v) })}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function GenrePicker(props: {
  id?: string;
  values: Genre[];
  onChange: (v: Genre[]) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t } = useTranslation("songs");
  return (
    <MultiPicker<Genre>
      {...props}
      options={GENRES}
      label={(g) => t(`common:genres.${g}`)}
      color={genreColor}
      placeholder={t("form.selectGenres")}
      selectedLabel={(count) => t("form.genresSelected", { count })}
      searchPlaceholder={t("filters.searchGenres")}
      emptyText={t("filters.noGenres")}
    />
  );
}

export function IssuePicker(props: {
  id?: string;
  values: Issue[];
  onChange: (v: Issue[]) => void;
}) {
  const { t } = useTranslation("reviews");
  return (
    <MultiPicker<Issue>
      {...props}
      options={ISSUES}
      label={(i) => t(`common:issues.${i}`)}
      color={issueColor}
      placeholder={t("fields.noIssues")}
      selectedLabel={(count) => t("fields.issuesSelected", { count })}
      searchPlaceholder={t("fields.searchIssues")}
      emptyText={t("common:empty.noResults")}
    />
  );
}

/** Machine choice as a radio group; wraps on narrow screens. */
export function MachinePicker({
  id,
  value,
  onChange,
  allowNone,
  noneLabel,
  label,
}: {
  id?: string;
  value: MachineType | null;
  onChange: (v: MachineType | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  label: string;
}) {
  const options: (MachineType | null)[] = [...MACHINE_TYPES, ...(allowNone ? [null] : [])];
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
    >
      {options.map((m) => {
        const selected = value === m;
        return (
          <Button
            key={m ?? "none"}
            type="button"
            role="radio"
            aria-checked={selected}
            size="sm"
            variant={selected ? "default" : "outline"}
            className={cn(selected && m && MACHINES[m].button)}
            onClick={() => onChange(m)}
          >
            {m ? MACHINES[m].label : noneLabel}
          </Button>
        );
      })}
    </div>
  );
}

// --- sections and pagination ----------------------------------------------------------------------

/**
 * Collapsible block per machine. It starts open when it has items and opens
 * by itself when it gets its first item, unless the user collapsed it.
 */
export function MachineSection({
  type,
  count,
  countLabel,
  children,
}: {
  type: MachineType;
  count: number;
  countLabel: string;
  children: ReactNode;
}) {
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const collapsed = userCollapsed ?? count === 0;
  const regionId = `machine-section-${type}`;
  return (
    <section className={cn("border rounded-lg", MACHINES[type].border)}>
      <h3>
        <button
          type="button"
          onClick={() => setUserCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-controls={regionId}
          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
          <MachineBadge type={type} className="text-sm px-3 py-1" />
          <span className="text-sm text-muted-foreground">{countLabel}</span>
        </button>
      </h3>
      {!collapsed && (
        <div id={regionId} className="px-4 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize?: (s: number) => void;
}) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav
      aria-label={t("pagination.page", { page, pages })}
      className="flex flex-wrap items-center justify-between gap-2 pt-2"
    >
      <p className="text-sm text-muted-foreground">
        {t("pagination.showing", { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        {onPageSize && (
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            {t("pagination.perPage")}
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label={t("pagination.previous")}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label={t("pagination.next")}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

// --- buttons --------------------------------------------------------------------------------------

export function FavoriteButton({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: (next: boolean) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const label = active ? t("actions.removeFavorite") : t("actions.addFavorite");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 w-8 p-0", active && "text-red-500", className)}
      onClick={() => onToggle(!active)}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} aria-hidden="true" />
    </Button>
  );
}

/** Plays or stops a song in the global player. Hidden for songs without a playable link. */
export function PlayButton({
  track,
  className,
}: {
  track: { url?: string | null; title?: string; artist?: string };
  className?: string;
}) {
  const { t } = useTranslation();
  const player = usePlayer();
  if (!track.url || !videoId(track.url)) return null;
  const playing = player.isPlaying(track.url);
  const label = playing ? t("actions.stop") : t("actions.play");
  return (
    <Button
      type="button"
      variant={playing ? "default" : "outline"}
      size="sm"
      className={cn("h-8 w-8 p-0", className)}
      aria-pressed={playing}
      aria-label={`${label}: ${track.title ?? ""}`}
      title={label}
      onClick={() =>
        playing
          ? player.stop()
          : player.play({ url: track.url!, title: track.title ?? "", artist: track.artist ?? "" })
      }
    >
      {playing ? (
        <Pause className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Play className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

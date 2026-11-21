import { useDeferredValue, useState } from "react";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { ARTIST_OPTIONS, ARTIST_SONG_OPTIONS } from "@/graphql/library";
import type { Genre } from "@/gql/graphql";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { matches, normalizeKey } from "@/lib/text";
import { cn } from "@/lib/utils";

export interface ArtistChoice {
  id?: string; // undefined = new artist
  name: string;
}

export interface SongChoice {
  id?: string; // undefined = new song
  title: string;
  genres?: Genre[];
  youtubeUrl?: string | null;
}

interface ComboProps<T> {
  id: string;
  value: T | null;
  invalid?: boolean;
  describedBy?: string;
}

/** Artist picker: searches on the server, offers "Add …" when nothing matches exactly. */
export function ArtistCombobox({
  id,
  value,
  onSelect,
  invalid,
  describedBy,
}: ComboProps<ArtistChoice> & { onSelect: (a: ArtistChoice) => void }) {
  const { t } = useTranslation("reviews");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const { data } = useQuery(ARTIST_OPTIONS, {
    variables: { search: deferred.trim() || null },
    skip: !open,
  });
  const items = data?.artists.items ?? [];
  const exact = items.some((a) => normalizeKey(a.name) === normalizeKey(search));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn("w-full justify-between font-normal", invalid && "border-destructive")}
        >
          <span className="truncate">
            {value ? value.name : t("log.artistPlaceholder")}
            {value && !value.id && (
              <Badge variant="outline" className="ml-2 text-xs">
                {t("log.new")}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("log.artistPlaceholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t("log.noArtists")}</CommandEmpty>
            <CommandGroup>
              {items.map((a) => (
                <CommandItem
                  key={a.id}
                  value={a.id}
                  keywords={[a.name]}
                  onSelect={() => {
                    onSelect({ id: a.id, name: a.name });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value?.id === a.id ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{a.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t("log.songCount", { count: a.songCount })}
                  </span>
                </CommandItem>
              ))}
              {search.trim() && !exact && (
                <CommandItem
                  value={`__new__${search}`}
                  onSelect={() => {
                    onSelect({ name: search.trim() });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("log.createArtist", { name: search.trim() })}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Song picker for the chosen artist; matching ignores case, width and kana type. */
export function SongCombobox({
  id,
  artistId,
  value,
  onSelect,
  disabled,
  invalid,
  describedBy,
}: ComboProps<SongChoice> & {
  artistId?: string;
  onSelect: (s: SongChoice) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("reviews");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useQuery(ARTIST_SONG_OPTIONS, {
    variables: { id: artistId ?? "" },
    skip: !artistId,
  });
  const songs = (data?.artist?.songs ?? []).filter(
    (s) => !search.trim() || matches(s.title, search),
  );
  const exact = (data?.artist?.songs ?? []).some(
    (s) => normalizeKey(s.title) === normalizeKey(search),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn("w-full justify-between font-normal", invalid && "border-destructive")}
        >
          <span className="truncate">
            {value ? value.title : disabled ? t("log.chooseArtistFirst") : t("log.songPlaceholder")}
            {value && !value.id && (
              <Badge variant="outline" className="ml-2 text-xs">
                {t("log.new")}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("log.songPlaceholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t("log.noSongs")}</CommandEmpty>
            <CommandGroup>
              {songs.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => {
                    onSelect({
                      id: s.id,
                      title: s.title,
                      genres: s.genres,
                      youtubeUrl: s.youtubeUrl,
                    });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value?.id === s.id ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  {s.title}
                </CommandItem>
              ))}
              {search.trim() && !exact && (
                <CommandItem
                  value={`__new__${search}`}
                  onSelect={() => {
                    onSelect({ title: search.trim() });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("log.createSong", { name: search.trim() })}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

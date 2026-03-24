import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  GET_MY_REVIEWS,
  GET_MY_FAVORITES,
  DELETE_ACCOUNT,
  EXPORT_DATA,
  IMPORT_DATA,
  TOGGLE_FAVORITE,
} from "../graphql/queries";
import type { Review, FavoriteSong } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { formatDateYYYYMMDD } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import FloatingPlayer from "../components/shared/FloatingPlayer";
import UserAvatar from "../components/ui/user-avatar";
import ProfileStatsCards from "../components/profile/ProfileStatsCards";
import ProfileRecentActivity from "../components/profile/ProfileRecentActivity";
import ProfileFavorites from "../components/profile/ProfileFavorites";
import ProfileDangerZone from "../components/profile/ProfileDangerZone";
import ProfilePersonalInfo from "../components/profile/ProfilePersonalInfo";
import ProfileChangePassword from "../components/profile/ProfileChangePassword";

const Profile = () => {
  const { user, refetchUser, logout } = useAuth();
  const { t, i18n } = useTranslation("profile");

  const [activePlayerUrl, setActivePlayerUrl] = useState<string | null>(null);
  const [activePlayerInfo, setActivePlayerInfo] = useState("");

  const [deleteAccount, { loading: deletingAccount }] = useMutation(
    DELETE_ACCOUNT,
    {
      onCompleted: () => {
        logout();
      },
    },
  );

  const [toggleFavorite] = useMutation(TOGGLE_FAVORITE, {
    refetchQueries: [{ query: GET_MY_FAVORITES }],
    update(cache, _, { variables }) {
      cache.modify({
        id: cache.identify({ __typename: "Song", id: variables?.songId }),
        fields: { isFavorite: (prev: boolean) => !prev },
      });
    },
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery(GET_MY_REVIEWS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const { data: favoritesData, refetch: refetchFavorites } = useQuery(GET_MY_FAVORITES, {
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const [fetchExportData, { loading: exporting }] = useLazyQuery(EXPORT_DATA, {
    fetchPolicy: "network-only",
  });

  const [importData, { loading: importing }] = useMutation(IMPORT_DATA);

  const today = new Date();
  const exportFileBaseName = `myuta-export-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const downloadFile = (content: BlobPart, type: string, filename: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const getExportData = async () => {
    const { data } = await fetchExportData();
    return data?.exportData ?? "";
  };

  const handleExportJSON = async () => {
    try {
      const exportData = await getExportData();
      if (!exportData) {
        return;
      }
      downloadFile(exportData, "application/json", `${exportFileBaseName}.json`);
      trackEvent({ name: "export_data" });
    } catch {
      toast.error(t("data.exportError"));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      JSON.parse(text);

      const { data } = await importData({ variables: { jsonData: text } });
      const result = data?.importData;
      if (result) {
        toast.success(
          t("data.importedCount", { count: result.reviewsImported }) +
          (result.reviewsSkipped > 0 ? t("data.skipped", { count: result.reviewsSkipped }) : "")
        );
        trackEvent({ name: "import_data", data: { reviewsImported: result.reviewsImported } });
        if (result.errors?.length > 0) {
          toast.warning(t("data.importWarnings", { count: result.errors.length }));
        }

        await Promise.all([refetchUser(), refetchReviews(), refetchFavorites()]);
      }
    } catch (error) {
      const message = error instanceof SyntaxError
        ? t("data.invalidJson")
        : (error as Error).message || t("data.importError");
      toast.error(message);
    } finally {
      const input = e.target as HTMLInputElement;
      if (input) input.value = "";
    }
  };

  const handleDeleteAccount = async (password: string): Promise<string | null> => {
    if (!password) {
      return t("dangerZone.passwordPlaceholder");
    }
    try {
      await deleteAccount({ variables: { password } });
      return null;
    } catch (error) {
      toast.error(t("toast.deleteAccountFailed"));
      return (error as Error).message || t("toast.deleteAccountFailed");
    }
  };

  const handleExportCSV = async () => {
    try {
      const exportData = await getExportData();
      if (!exportData) {
        return;
      }

      const parsed = JSON.parse(exportData);

      interface ExportRow {
        [key: string]: string | string[] | undefined;
      }

      const rows: ExportRow[] = parsed.reviews || [];
      if (rows.length === 0) {
        return;
      }

      const headers = [
        "date",
        "song",
        "artist",
        "score",
        "machineType",
        "genres",
        "issues",
        "notes",
        "youtubeUrl",
      ];
      const csvLines = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((header) => {
            const value = header === "issues" || header === "genres"
              ? (Array.isArray(row[header]) ? (row[header] as string[]).join(";") : "")
              : (row[header] ?? "");
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(",")
        ),
      ];

      downloadFile(csvLines.join("\n"), "text/csv", `${exportFileBaseName}.csv`);
    } catch (error) {
      toast.error((error as Error).message || t("data.exportError"));
    }
  };

  if (!user) {
    return null;
  }

  const reviews: Review[] = reviewsData?.myReviews || [];
  const favorites: FavoriteSong[] = favoritesData?.myFavorites || [];

  const damReviews = reviews.filter((r) => r.machineType === "DAM");
  const joysoundReviews = reviews.filter((r) => r.machineType === "JOYSOUND");

  const recentReviews = reviews.slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <UserAvatar
              name={user.name}
              email={user.email}
              size="lg"
              className="shadow-lg"
            />
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {user.name}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("memberSince", { date: formatDateYYYYMMDD(user.createdAt) })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileStatsCards
        reviews={reviews}
        damReviews={damReviews}
        joysoundReviews={joysoundReviews}
      />

      <ProfileRecentActivity recentReviews={recentReviews} />

      <ProfileFavorites
        favorites={favorites}
        activePlayerUrl={activePlayerUrl}
        onTogglePlayer={(url, info) => {
          if (url) {
            setActivePlayerUrl(url);
            setActivePlayerInfo(info);
          } else {
            setActivePlayerUrl(null);
          }
        }}
        onRemoveFavorite={(songId) => { toggleFavorite({ variables: { songId } }); trackEvent({ name: "toggle_favorite", data: { type: "song" } }); }}
      />

      <ProfilePersonalInfo user={user} onSaved={refetchUser} />

      <ProfileChangePassword />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" /> {t("preferences.language")}
          </CardTitle>
          <CardDescription>{t("preferences.languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={i18n.language === "en" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => { i18n.changeLanguage("en"); trackEvent({ name: "change_language", data: { language: "en" } }); }}
            >
              🇺🇸 {t("preferences.english")}
            </Button>
            <Button
              variant={i18n.language === "ja" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => { i18n.changeLanguage("ja"); trackEvent({ name: "change_language", data: { language: "ja" } }); }}
            >
              🇯🇵 {t("preferences.japanese")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProfileDangerZone
        exporting={exporting}
        importing={importing}
        deletingAccount={deletingAccount}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        onImport={handleImport}
        onDeleteAccount={handleDeleteAccount}
      />

      {activePlayerUrl && (
        <FloatingPlayer
          url={activePlayerUrl}
          songInfo={activePlayerInfo}
          onClose={() => setActivePlayerUrl(null)}
        />
      )}
    </div>
  );
};

export default Profile;

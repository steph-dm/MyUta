import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Lock,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  UPDATE_USER,
  ME,
  GET_MY_REVIEWS,
  GET_MY_FAVORITES,
  CHANGE_PASSWORD,
  DELETE_ACCOUNT,
  EXPORT_DATA,
  IMPORT_DATA,
  TOGGLE_FAVORITE,
} from "../graphql/queries";
import type { Review, FavoriteSong, MachineType } from "../types";
import { MACHINE_TYPES } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { cn, formatDateYYYYMMDD, getMachineButtonColor } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import FloatingPlayer from "../components/shared/FloatingPlayer";
import UserAvatar from "../components/ui/user-avatar";
import ProfileStatsCards from "../components/profile/ProfileStatsCards";
import ProfileRecentActivity from "../components/profile/ProfileRecentActivity";
import ProfileFavorites from "../components/profile/ProfileFavorites";
import ProfileDangerZone from "../components/profile/ProfileDangerZone";

const validatePassword = (
  password: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null => {
  if (password.length < 12) {
    return t("validation.passwordMin", { ns: "auth" });
  }
  if (!/[a-z]/.test(password)) {
    return t("validation.passwordLowercase", { ns: "auth" });
  }
  if (!/[A-Z]/.test(password)) {
    return t("validation.passwordUppercase", { ns: "auth" });
  }
  if (!/[0-9]/.test(password)) {
    return t("validation.passwordNumber", { ns: "auth" });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return t("validation.passwordSpecial", { ns: "auth" });
  }

  return null;
};

const Profile = () => {
  const { user, refetchUser, logout } = useAuth();
  const { t, i18n } = useTranslation("profile");

  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [birthdate, setBirthdate] = useState(
    user?.birthdate ? String(user.birthdate).split("T")[0] : "",
  );
  const [defaultMachineType, setDefaultMachineType] =
    useState<MachineType | null>(
      (user?.defaultMachineType as MachineType) || null,
    );
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [activePlayerUrl, setActivePlayerUrl] = useState<string | null>(null);
  const [activePlayerInfo, setActivePlayerInfo] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setEmail(user.email || "");
    setName(user.name || "");
    setBirthdate(user.birthdate ? String(user.birthdate).split("T")[0] : "");
    setDefaultMachineType((user.defaultMachineType as MachineType) || null);
  }, [user]);

  const [updateUser, { loading }] = useMutation(UPDATE_USER, {
    refetchQueries: [{ query: ME }],
    onCompleted: async () => {
      setSuccessMessage(t("toast.profileSaved"));
      setErrorMessage("");
      await refetchUser();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setSuccessMessage("");
    },
  });

  const [changePassword, { loading: changingPassword }] = useMutation(
    CHANGE_PASSWORD,
    {
      onCompleted: () => {
        trackEvent({ name: "change_password" });
        setPasswordSuccess(t("changePassword.success"));
        setPasswordError("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(""), 3000);
      },
      onError: (error) => {
        setPasswordError(error.message);
        setPasswordSuccess("");
      },
    },
  );

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!user?.id) return;

    try {
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      await updateUser({
        variables: {
          id: user.id,
          email: trimmedEmail !== user.email ? trimmedEmail : undefined,
          name: trimmedName !== user.name ? trimmedName : undefined,
          birthdate:
            birthdate !== String(user.birthdate).split("T")[0]
              ? birthdate
              : undefined,
          defaultMachineType:
            defaultMachineType !== user.defaultMachineType
              ? defaultMachineType
              : undefined,
        },
      });
      toast(t("toast.profileSaved"));
    } catch {
      toast.error(t("toast.profileSaveFailed"));
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError(t("changePassword.mismatch"));
      return;
    }

    const passwordValidationError = validatePassword(newPassword, t);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    try {
      await changePassword({
        variables: { currentPassword, newPassword },
      });
      toast(t("toast.passwordUpdated"));
    } catch {
      toast.error(t("toast.passwordUpdateFailed"));
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" /> {t("personalInfo")}
          </CardTitle>
          <CardDescription>{t("title")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("username")}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t("namePlaceholder")}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  {t("characters", { count: name.length, max: 20 })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthdate">{t("birthdate")}</Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultMachineType">
                {t("defaultMachine")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("defaultMachineDesc")}
              </p>
              <div className="flex gap-2">
                {MACHINE_TYPES.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={
                      defaultMachineType === type ? "default" : "outline"
                    }
                    className={cn(
                      "flex-1",
                      defaultMachineType === type && getMachineButtonColor(type),
                    )}
                    onClick={() => setDefaultMachineType(type)}
                  >
                    {type}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={defaultMachineType === null ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDefaultMachineType(null)}
                >
                  {t("none")}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? t("saving") : t("actions.save", { ns: "common" })}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" /> {t("changePassword.title")}
          </CardTitle>
          <CardDescription>{t("changePassword.title")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordSuccess && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {passwordSuccess}
                </AlertDescription>
              </Alert>
            )}

            {passwordError && (
              <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {passwordError}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("changePassword.current")}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("changePassword.new")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("changePassword.confirm")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={12}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? t("changePassword.submitting") : t("changePassword.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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

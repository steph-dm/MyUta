import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { DASHBOARD, REVIEWS } from "@/graphql/reviews";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UserAvatar from "@/components/ui/user-avatar";
import { ListSkeleton, MachineBadge, ScoreBadge } from "@/components/shared";
import {
  DeleteAccountCard,
  EmailCard,
  PasswordCard,
  PersonalInfoCard,
  SessionsCard,
} from "@/components/profile/AccountCards";
import DataCard from "@/components/profile/DataCard";
import FavoritesCard from "@/components/profile/FavoritesCard";
import { useAuth } from "@/contexts/AuthContext";
import { formatDay } from "@/lib/dates";
import { intlLocale } from "@/i18n";

export default function Profile() {
  const { t } = useTranslation("profile");
  const { user } = useAuth();
  const { data: stats } = useQuery(DASHBOARD);
  const { data: recent, loading } = useQuery(REVIEWS, { variables: { limit: 5 } });
  if (!user) return null;
  const s = stats?.dashboardStats;
  const since = new Date(user.createdAt).toLocaleDateString(intlLocale(), {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 pt-6">
          <UserAvatar name={user.name} email={user.email} size="lg" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">{t("memberSince", { date: since })}</p>
          </div>
        </CardContent>
      </Card>

      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("stats.totalReviews")}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{s.totalReviews}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("stats.library")}</CardDescription>
              <CardTitle className="text-base">
                {t("stats.libraryValue", { songs: s.totalSongs, artists: s.totalArtists })}
              </CardTitle>
            </CardHeader>
          </Card>
          {s.machineStats.map((m) => (
            <Card key={m.machineType}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  {t("stats.average")}{" "}
                  <MachineBadge type={m.machineType} className="text-xs px-2 py-0" />
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">{m.averageScore.toFixed(3)}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">
            {t("recent.title")}
          </CardTitle>
          <CardDescription>{t("recent.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !recent ? (
            <ListSkeleton rows={3} />
          ) : (
            <ul className="space-y-2">
              {(recent?.reviews.items ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/songs/${r.song.id}`}
                      className="font-medium text-sm hover:underline block truncate"
                    >
                      {r.song.title}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.song.artist.name} · {formatDay(r.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <MachineBadge type={r.machineType} className="text-xs" />
                    <ScoreBadge
                      score={r.score}
                      machine={r.machineType}
                      personalBest={r.isPersonalBest}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FavoritesCard />
      <PersonalInfoCard key={user.id} user={user} />
      <EmailCard user={user} />
      <PasswordCard />
      <SessionsCard />
      <DataCard />
      <DeleteAccountCard reviewCount={s?.totalReviews ?? 0} />
    </div>
  );
}

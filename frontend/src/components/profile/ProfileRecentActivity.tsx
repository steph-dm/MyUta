import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { Review } from "../../types";
import ReviewMobileCard from "../reviews/ReviewMobileCard";
import FloatingPlayer from "../shared/FloatingPlayer";

interface ProfileRecentActivityProps {
    recentReviews: Review[];
}

const ProfileRecentActivity = ({ recentReviews }: ProfileRecentActivityProps) => {
    const { t } = useTranslation("profile");
    const [activePlayerUrl, setActivePlayerUrl] = useState<string | null>(null);
    const [activePlayerInfo, setActivePlayerInfo] = useState("");

    if (recentReviews.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" /> {t("recentActivity")}
                </CardTitle>
                <CardDescription>{t("last5Reviews")}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {recentReviews.map((review) => (
                        <ReviewMobileCard
                            key={review.id}
                            review={review}
                            isSelected={false}
                            showActions={false}
                            activePlayerUrl={activePlayerUrl}
                            onPlay={(url, info) => {
                                setActivePlayerUrl(url);
                                setActivePlayerInfo(info);
                            }}
                            onStop={() => setActivePlayerUrl(null)}
                        />
                    ))}
                </div>
            </CardContent>

            {activePlayerUrl && (
                <FloatingPlayer
                    url={activePlayerUrl}
                    songInfo={activePlayerInfo}
                    onClose={() => setActivePlayerUrl(null)}
                />
            )}
        </Card>
    );
};

export default ProfileRecentActivity;

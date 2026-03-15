import { useTranslation } from "react-i18next";
import YouTubeAudioPlayer from "../reviews/YouTubeAudioPlayer";
import { Music, X } from "lucide-react";

interface FloatingPlayerProps {
    url: string;
    songInfo: string;
    onClose: () => void;
}

const FloatingPlayer = ({ url, songInfo, onClose }: FloatingPlayerProps) => {
    const { t } = useTranslation("common");

    return (
        <div className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-auto sm:right-4 z-50 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 p-3 bg-background border-t sm:border sm:rounded-lg shadow-lg">
            <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate max-w-[calc(100%-4rem)] sm:max-w-[350px]">
                {songInfo}
            </span>
            <button
                onClick={onClose}
                className="sm:order-last flex-shrink-0 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors ml-auto sm:ml-0"
                aria-label={t("actions.closePlayer")}
            >
                <X className="h-4 w-4" />
            </button>
            <YouTubeAudioPlayer key={url} url={url} autoPlay className="w-full sm:w-[220px]" />
        </div>
    );
};

export default FloatingPlayer;

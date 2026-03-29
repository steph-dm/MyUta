import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import MaterialIcon from "../components/ui/MaterialIcon";

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <MaterialIcon
        icon="mic"
        size={64}
        className="mb-4 text-muted-foreground"
      />
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">{t("errors.notFoundDesc")}</p>
      <Button asChild>
        <Link to="/">{t("errors.backHome")}</Link>
      </Button>
    </div>
  );
};

export default NotFound;

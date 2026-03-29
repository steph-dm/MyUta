import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { UPDATE_USER, ME } from "../../graphql/queries";
import type { MachineType } from "../../types";
import { MACHINE_TYPES } from "../../types";
import { cn, getMachineButtonColor } from "../../lib/utils";
import { translateError } from "../../lib/error-messages";

interface Props {
  user: {
    id: string;
    email: string;
    name: string;
    birthdate: string;
    defaultMachineType: string | null;
  };
  onSaved: () => Promise<void>;
}

const ProfilePersonalInfo = ({ user, onSaved }: Props) => {
  const { t } = useTranslation("profile");

  const [email, setEmail] = useState(user.email || "");
  const [name, setName] = useState(user.name || "");
  const [birthdate, setBirthdate] = useState(
    user.birthdate ? String(user.birthdate).split("T")[0] : "",
  );
  const [defaultMachineType, setDefaultMachineType] =
    useState<MachineType | null>(
      (user.defaultMachineType as MachineType) || null,
    );
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
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
      await onSaved();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error) => {
      setErrorMessage(translateError(error.message, t));
      setSuccessMessage("");
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

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

  return (
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
            <Label htmlFor="defaultMachineType">{t("defaultMachine")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("defaultMachineDesc")}
            </p>
            <div className="flex gap-2">
              {MACHINE_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={defaultMachineType === type ? "default" : "outline"}
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
  );
};

export default ProfilePersonalInfo;

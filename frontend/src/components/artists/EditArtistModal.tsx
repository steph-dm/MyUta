import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client";
import { UPDATE_ARTIST } from "../../graphql/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "../../lib/utils";
import { trackEvent } from "../../lib/analytics";

interface EditArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist: { id: string; name: string } | null;
}

const EditArtistModal = ({ isOpen, onClose, artist }: EditArtistModalProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation("artists");

  const [updateArtist] = useMutation(UPDATE_ARTIST);

  useEffect(() => {
    if (artist) {
      setName(artist.name);
    }
  }, [artist]);

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("modal.namePlaceholder"));
      return;
    }

    if (trimmed === artist.name) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await updateArtist({
        variables: { id: artist.id, name: trimmed },
      });
      toast(t("modal.updateSuccess"));
      trackEvent({ name: "edit_artist", data: { name: trimmed } });
      onClose();
    } catch {
      toast.error(t("modal.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!artist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("modal.editTitle")}</DialogTitle>
          <DialogDescription>{t("modal.editDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("modal.name")}</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder={t("modal.namePlaceholder")}
              className={cn(error && "border-red-500")}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("modal.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("modal.saving") : t("modal.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditArtistModal;

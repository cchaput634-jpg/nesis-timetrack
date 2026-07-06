import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useProfileContext } from "@/context/ProfileContext";
import { ACTIVITY_COLOR_PALETTE, type ClientProfile } from "@/types";

interface ManageProfilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Boîte de gestion des profils clients : ajout, renommage, couleur, suppression. */
export function ManageProfilesDialog({
  open,
  onOpenChange,
}: ManageProfilesDialogProps) {
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
  } = useProfileContext();
  const [pendingDelete, setPendingDelete] = useState<ClientProfile | null>(
    null
  );

  const handleAdd = () => {
    const p = addProfile("Nouveau client");
    setActiveProfileId(p.id);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const remaining = profiles.filter((p) => p.id !== pendingDelete.id);
    // Ne pas laisser 0 profil : on empêche la suppression du dernier.
    if (remaining.length === 0) return;
    // Si le profil supprimé était actif, on bascule vers le premier restant.
    if (pendingDelete.id === activeProfileId) {
      setActiveProfileId(remaining[0].id);
    }
    deleteProfile(pendingDelete.id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Profils clients</DialogTitle>
            <DialogDescription>
              Chaque profil a son propre espace de données (activités,
              sessions, notes, interlocuteurs, entreprises). Basculer entre
              deux profils change tout ce qui s'affiche dans l'app.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {profiles.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                onUpdate={updateProfile}
                canDelete={profiles.length > 1}
                onDelete={() => setPendingDelete(profile)}
              />
            ))}

            <Button
              variant="outline"
              onClick={handleAdd}
              className="self-start"
            >
              <Plus className="h-4 w-4" />
              Nouveau profil
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              <Check className="h-4 w-4" />
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={
          pendingDelete ? `Supprimer « ${pendingDelete.name} » ?` : ""
        }
        description="Toutes les données du profil (activités, sessions, notes, interlocuteurs, entreprises) seront définitivement supprimées."
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

/** Ligne éditable d'un profil : nom + palette de couleurs + suppression. */
function ProfileRow({
  profile,
  onUpdate,
  canDelete,
  onDelete,
}: {
  profile: ClientProfile;
  onUpdate: (
    id: string,
    patch: Partial<Pick<ClientProfile, "name" | "color">>
  ) => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <Label
          htmlFor={`profile-name-${profile.id}`}
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Nom
        </Label>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-40"
            onClick={onDelete}
            disabled={!canDelete}
            aria-label={`Supprimer le profil ${profile.name}`}
            title={
              canDelete
                ? undefined
                : "Impossible de supprimer le dernier profil"
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Input
        id={`profile-name-${profile.id}`}
        value={profile.name}
        onChange={(e) => onUpdate(profile.id, { name: e.target.value })}
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ACTIVITY_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Couleur ${c}`}
            aria-pressed={profile.color === c}
            onClick={() => onUpdate(profile.id, { color: c })}
            className={cn(
              "h-7 w-7 rounded-full border-2 transition",
              profile.color === c
                ? "border-foreground scale-110"
                : "border-transparent hover:border-muted-foreground/40"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

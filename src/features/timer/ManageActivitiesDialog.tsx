import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { ACTIVITY_COLOR_PALETTE, type Activity } from "@/types";

interface ManageActivitiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  /** Nombre de sessions par activité (pour prévenir en cas de suppression). */
  sessionCountByActivity: Record<string, number>;
  onAdd: (label: string, color: string) => Activity;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Activity, "label" | "color">>
  ) => void;
  onDelete: (id: string) => void;
}

/**
 * Boîte de gestion des activités : ajout, renommage, changement de couleur,
 * suppression. La liste est éditable en place ; les changements sont
 * persistés au fur et à mesure.
 */
export function ManageActivitiesDialog({
  open,
  onOpenChange,
  activities,
  sessionCountByActivity,
  onAdd,
  onUpdate,
  onDelete,
}: ManageActivitiesDialogProps) {
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);

  const handleAdd = () => {
    // Choisit la première couleur non utilisée si possible.
    const used = new Set(activities.map((a) => a.color));
    const color =
      ACTIVITY_COLOR_PALETTE.find((c) => !used.has(c)) ??
      ACTIVITY_COLOR_PALETTE[0];
    onAdd("Nouvelle activité", color);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personnaliser les activités</DialogTitle>
            <DialogDescription>
              Renommez, recolorez, ajoutez ou supprimez les activités du
              chronomètre. Les sessions déjà enregistrées ne sont pas
              affectées.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                sessionCount={sessionCountByActivity[activity.id] ?? 0}
                onUpdate={onUpdate}
                onDelete={() => setPendingDelete(activity)}
              />
            ))}

            <Button variant="outline" onClick={handleAdd} className="self-start">
              <Plus className="h-4 w-4" />
              Nouvelle activité
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
          pendingDelete ? `Supprimer « ${pendingDelete.label} » ?` : ""
        }
        description={
          pendingDelete
            ? sessionCountByActivity[pendingDelete.id]
              ? `${sessionCountByActivity[pendingDelete.id]} session(s) l'utilisent déjà. Elles resteront dans l'historique mais afficheront « activité supprimée ».`
              : "Cette activité n'a aucune session associée."
            : undefined
        }
        onConfirm={() => pendingDelete && onDelete(pendingDelete.id)}
      />
    </>
  );
}

/** Ligne éditable d'une activité (label + palette de couleurs + suppression). */
function ActivityRow({
  activity,
  sessionCount,
  onUpdate,
  onDelete,
}: {
  activity: Activity;
  sessionCount: number;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Activity, "label" | "color">>
  ) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <Label
          htmlFor={`label-${activity.id}`}
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Nom
        </Label>
        <span className="ml-auto text-xs text-muted-foreground">
          {sessionCount} session{sessionCount > 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={`Supprimer l'activité ${activity.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Input
        id={`label-${activity.id}`}
        value={activity.label}
        onChange={(e) => onUpdate(activity.id, { label: e.target.value })}
        placeholder="Nom de l'activité"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ACTIVITY_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Couleur ${c}`}
            aria-pressed={activity.color === c}
            onClick={() => onUpdate(activity.id, { color: c })}
            className={cn(
              "h-7 w-7 rounded-full border-2 transition",
              activity.color === c
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

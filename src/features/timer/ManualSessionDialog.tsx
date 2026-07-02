import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Activity } from "@/types";

interface ManualSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  /** Callback identique à celui utilisé par le chrono lorsqu'il s'arrête. */
  onSave: (activityId: string, startedAt: number, durationSec: number) => void;
}

/** Convertit une chaîne "YYYY-MM-DDTHH:mm" (input datetime-local) en epoch ms. */
function localToEpoch(local: string): number {
  return new Date(local).getTime();
}

/** Retourne "YYYY-MM-DDTHH:mm" en heure locale pour l'input datetime-local. */
function nowAsLocal(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Boîte de saisie manuelle d'une session (pour rattraper du temps oublié
 * ou perdu). Enregistre exactement comme le chrono, avec une durée en
 * heures + minutes et un horodatage éditable (par défaut : maintenant).
 */
export function ManualSessionDialog({
  open,
  onOpenChange,
  activities,
  onSave,
}: ManualSessionDialogProps) {
  const [activityId, setActivityId] = useState<string>("");
  const [hours, setHours] = useState<string>("1");
  const [minutes, setMinutes] = useState<string>("0");
  const [when, setWhen] = useState<string>(nowAsLocal());

  // Reset à chaque ouverture (première activité par défaut).
  useEffect(() => {
    if (!open) return;
    setActivityId(activities[0]?.id ?? "");
    setHours("1");
    setMinutes("0");
    setWhen(nowAsLocal());
  }, [open, activities]);

  const h = Math.max(0, Number(hours) || 0);
  const m = Math.max(0, Math.min(59, Number(minutes) || 0));
  const durationSec = h * 3600 + m * 60;
  const canSave = activityId !== "" && durationSec > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave(activityId, localToEpoch(when), durationSec);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une session manuellement</DialogTitle>
          <DialogDescription>
            Enregistre une durée déjà effectuée dans l'historique
            hebdomadaire.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Sélecteur d'activité — grille comme dans la card du timer. */}
          <div className="grid gap-2">
            <Label>Activité</Label>
            <div className="grid grid-cols-2 gap-2">
              {activities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActivityId(a.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    activityId === a.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  )}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                  <span className="truncate">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Durée : heures + minutes. */}
          <div className="grid gap-2">
            <Label>Durée</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-20 text-center tabular-nums"
                inputMode="numeric"
              />
              <span className="text-sm text-muted-foreground">h</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-20 text-center tabular-nums"
                inputMode="numeric"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          {/* Horodatage : facultatif, par défaut maintenant. */}
          <div className="grid gap-2">
            <Label htmlFor="manual-when">Date &amp; heure de début</Label>
            <Input
              id="manual-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sert au regroupement par semaine dans l'historique.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!canSave}>
              <Plus className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

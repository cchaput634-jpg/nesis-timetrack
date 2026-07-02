import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, Settings2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/time";
import { useTimer } from "@/hooks/useTimer";
import type { Activity } from "@/types";

interface TimerCardProps {
  /** Activités disponibles (chargées depuis D1). */
  activities: Activity[];
  /** Callback d'enregistrement d'une session terminée. */
  onSave: (activity: string, startedAt: number, durationSec: number) => void;
  /** Ouvre la boîte de gestion des activités. */
  onManage: () => void;
}

/** Module de commande du chronomètre : sélection d'activité + chrono + actions. */
export function TimerCard({ activities, onSave, onManage }: TimerCardProps) {
  const [activityId, setActivityId] = useState<string>("");
  const { status, elapsedSec, start, pause, reset } = useTimer();
  const running = status === "running";

  // Sélectionne automatiquement la première activité disponible dès qu'elle
  // est chargée, et se réinitialise si l'activité active est supprimée.
  useEffect(() => {
    if (activities.length === 0) return;
    if (!activities.some((a) => a.id === activityId)) {
      setActivityId(activities[0].id);
    }
  }, [activities, activityId]);

  const current = activities.find((a) => a.id === activityId) ?? null;

  const handleStop = () => {
    const result = reset();
    if (result && activityId) {
      onSave(activityId, result.startedAt, result.durationSec);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Réglages des activités — icône en coin haut-droite, indépendante
          du flux vertical du contenu (n'occupe pas d'espace). */}
      <button
        type="button"
        onClick={onManage}
        aria-label="Personnaliser les activités"
        title="Personnaliser les activités"
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      <CardContent className="flex flex-col items-center gap-8 p-6 sm:p-10">
        {/* Sélecteur d'activités — grille responsive, désactivé pendant qu'un
            chrono tourne. */}
        {activities.length === 0 ? (
          <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <p>Aucune activité pour l'instant.</p>
            <Button size="sm" onClick={onManage}>
              <Plus className="h-4 w-4" />
              Créer une activité
            </Button>
          </div>
        ) : (
          <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
            {activities.map((a) => (
              <ActivityButton
                key={a.id}
                active={activityId === a.id}
                disabled={status !== "idle"}
                color={a.color}
                label={a.label}
                onClick={() => setActivityId(a.id)}
              />
            ))}
          </div>
        )}

        {/* Affichage animé du chrono. */}
        <motion.div
          animate={{ scale: running ? 1.03 : 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative flex flex-col items-center"
        >
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: current.color }}
                />
                {current.label}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="tabular-nums text-6xl font-bold tracking-tight sm:text-7xl">
            {formatDuration(elapsedSec)}
          </div>

          {/* Pulsation « en cours ». */}
          <AnimatePresence>
            {running && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600"
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                />
                En cours…
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Boutons d'action. */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!running ? (
            <Button
              size="lg"
              onClick={start}
              disabled={!current}
              className="min-w-32"
            >
              <Play className="h-4 w-4" />
              {status === "paused" ? "Reprendre" : "Lancer"}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="secondary"
              onClick={pause}
              className="min-w-32"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          <Button
            size="lg"
            variant="destructive"
            onClick={handleStop}
            disabled={status === "idle"}
            className="min-w-32"
          >
            <Square className="h-4 w-4" />
            Arrêter &amp; Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityButtonProps {
  active: boolean;
  disabled?: boolean;
  color: string;
  label: string;
  onClick: () => void;
}

/** Bouton stylisé pour choisir une activité. La couleur de l'activité sert
 *  d'indicateur (pastille à gauche) plutôt que de couleur de fond, afin
 *  d'harmoniser visuellement même avec des palettes très variées. */
function ActivityButton({
  active,
  disabled,
  color,
  label,
  onClick,
}: ActivityButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-primary bg-primary text-primary-foreground shadow"
          : "border-input bg-background hover:bg-accent"
      )}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

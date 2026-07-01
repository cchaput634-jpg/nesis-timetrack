import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, Headphones, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/time";
import { useTimer } from "@/hooks/useTimer";
import { ACTIVITY_META, type ActivityType } from "@/types";

interface TimerCardProps {
  /** Callback d'enregistrement d'une session terminée. */
  onSave: (
    activity: ActivityType,
    startedAt: number,
    durationSec: number
  ) => void;
}

/** Module de commande du chronomètre : choix d'activité + chrono + actions. */
export function TimerCard({ onSave }: TimerCardProps) {
  const [activity, setActivity] = useState<ActivityType>("sav");
  const { status, elapsedSec, start, pause, reset } = useTimer();
  const running = status === "running";

  const handleStop = () => {
    const result = reset();
    if (result) onSave(activity, result.startedAt, result.durationSec);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-8 p-6 sm:p-10">
        {/* Sélecteur d'activité — désactivé pendant qu'un chrono tourne. */}
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          <ActivityButton
            active={activity === "sav"}
            disabled={status !== "idle"}
            icon={<Headphones className="h-4 w-4" />}
            label={ACTIVITY_META.sav.label}
            onClick={() => setActivity("sav")}
          />
          <ActivityButton
            active={activity === "demarchage"}
            disabled={status !== "idle"}
            icon={<Megaphone className="h-4 w-4" />}
            label={ACTIVITY_META.demarchage.label}
            onClick={() => setActivity("demarchage")}
          />
        </div>

        {/* Affichage animé du chrono. */}
        <motion.div
          animate={{ scale: running ? 1.03 : 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative flex flex-col items-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activity}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: ACTIVITY_META[activity].color }}
              />
              {ACTIVITY_META[activity].label}
            </motion.div>
          </AnimatePresence>

          <div className="tabular-nums text-6xl font-bold tracking-tight sm:text-7xl">
            {formatDuration(elapsedSec)}
          </div>

          {/* Pulsation "en cours" */}
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
            <Button size="lg" onClick={start} className="min-w-32">
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
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

/** Bouton d'onglet stylisé pour choisir l'activité. */
function ActivityButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: ActivityButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-primary bg-primary text-primary-foreground shadow"
          : "border-input bg-background hover:bg-accent"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

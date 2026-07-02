import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Timer as TimerIcon, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimerCard } from "./TimerCard";
import { WeeklyHistory } from "./WeeklyHistory";
import { ManageActivitiesDialog } from "./ManageActivitiesDialog";
import { ManualSessionDialog } from "./ManualSessionDialog";
import { formatCompact } from "@/lib/time";
import { useSessions } from "@/hooks/useSessions";
import { useActivities } from "@/hooks/useActivities";

/** Écran 1 : commande du chrono, statistiques et historique hebdomadaire. */
export function TimerScreen() {
  const { weeks, sessions, addSession, deleteSession } = useSessions();
  const { activities, byId, addActivity, updateActivity, deleteActivity } =
    useActivities();
  const [manageOpen, setManageOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const current = weeks[0];

  // Nombre de sessions par activité — utilisé par la boîte de gestion pour
  // prévenir l'utilisateur en cas de suppression d'une activité active.
  const sessionCountByActivity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) map[s.activity] = (map[s.activity] ?? 0) + 1;
    return map;
  }, [sessions]);

  // Cartes de statistiques : total de la semaine + une carte par activité
  // qui a déjà été chronométrée cette semaine (triée par temps décroissant).
  const stats = useMemo(() => {
    const items: {
      key: string;
      label: string;
      value: string;
      color: string;
      icon?: React.ReactNode;
    }[] = [
      {
        key: "__total__",
        label: "Total cette semaine",
        value: formatCompact(current?.totalSec ?? 0),
        color: "hsl(190 8% 20%)",
        icon: <TimerIcon className="h-4 w-4" />,
      },
    ];
    const perActivity = current?.perActivitySec ?? {};
    const entries = Object.entries(perActivity).sort((a, b) => b[1] - a[1]);
    for (const [id, sec] of entries) {
      const meta = byId.get(id);
      items.push({
        key: id,
        label: meta?.label ?? "(activité supprimée)",
        value: formatCompact(sec),
        color: meta?.color ?? "hsl(0 0% 60%)",
      });
    }
    return items;
  }, [current, byId]);

  return (
    <div className="flex flex-col gap-6">
      <TimerCard
        activities={activities}
        onSave={addSession}
        onManage={() => setManageOpen(true)}
      />

      {/* Grille de stats : responsive, une carte par activité utilisée. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                >
                  {s.icon ?? (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="tabular-nums text-xl font-bold">
                    {s.value}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Historique hebdomadaire</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setManualOpen(true)}
            disabled={activities.length === 0}
          >
            <Plus className="h-4 w-4" />
            Ajouter une session
          </Button>
        </div>
        <WeeklyHistory
          weeks={weeks}
          activitiesById={byId}
          onDelete={deleteSession}
        />
      </div>

      <ManageActivitiesDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        activities={activities}
        sessionCountByActivity={sessionCountByActivity}
        onAdd={addActivity}
        onUpdate={updateActivity}
        onDelete={deleteActivity}
      />

      <ManualSessionDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        activities={activities}
        onSave={addSession}
      />
    </div>
  );
}

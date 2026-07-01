import { motion } from "framer-motion";
import { Headphones, Megaphone, Timer as TimerIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TimerCard } from "./TimerCard";
import { WeeklyHistory } from "./WeeklyHistory";
import { formatCompact } from "@/lib/time";
import { useSessions } from "@/hooks/useSessions";
import { ACTIVITY_META } from "@/types";

/** Écran 1 : commande du chrono, statistiques et historique hebdomadaire. */
export function TimerScreen() {
  const { weeks, addSession, deleteSession } = useSessions();

  // Totaux de la semaine courante (première du tableau car trié décroissant).
  const current = weeks[0];
  const stats = [
    {
      label: "Total cette semaine",
      value: formatCompact(current?.totalSec ?? 0),
      icon: <TimerIcon className="h-4 w-4" />,
      color: "hsl(190 8% 20%)",
    },
    {
      label: "SAV",
      value: formatCompact(current?.savSec ?? 0),
      icon: <Headphones className="h-4 w-4" />,
      color: ACTIVITY_META.sav.color,
    },
    {
      label: "Démarchage",
      value: formatCompact(current?.demarchageSec ?? 0),
      icon: <Megaphone className="h-4 w-4" />,
      color: ACTIVITY_META.demarchage.color,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <TimerCard onSave={addSession} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                >
                  {s.icon}
                </span>
                <div>
                  <div className="tabular-nums text-xl font-bold">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Historique hebdomadaire</h2>
        <WeeklyHistory weeks={weeks} onDelete={deleteSession} />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import type { Activity } from "@/types";

/** Deux activités par défaut à la première utilisation (ids stables afin
 *  que les sessions historiques stockant "sav" / "demarchage" restent
 *  correctement rattachées après cette évolution). */
const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: "sav",
    label: "SAV",
    color: "hsl(195 22% 30%)",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "demarchage",
    label: "Démarchage",
    color: "hsl(182 66% 37%)",
    createdAt: 0,
    updatedAt: 0,
  },
];

type ActivityPatch = Partial<Pick<Activity, "label" | "color">>;

/**
 * Gère la liste des activités chronométrées personnalisables.
 * CRUD + persistance D1 + seed automatique à la première utilisation.
 */
export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getActivities().then((data) => {
      if (data.length === 0) {
        // Première utilisation : on installe les deux activités historiques.
        setActivities(DEFAULT_ACTIVITIES);
        void db.saveActivities(DEFAULT_ACTIVITIES);
      } else {
        setActivities(data);
      }
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: Activity[]) => {
    setActivities(next);
    void db.saveActivities(next);
  }, []);

  const addActivity = useCallback(
    (label: string, color: string): Activity => {
      const now = Date.now();
      const activity: Activity = {
        id: uid(),
        label,
        color,
        createdAt: now,
        updatedAt: now,
      };
      persist([...activities, activity]);
      return activity;
    },
    [activities, persist]
  );

  const updateActivity = useCallback(
    (id: string, patch: ActivityPatch) =>
      persist(
        activities.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a
        )
      ),
    [activities, persist]
  );

  const deleteActivity = useCallback(
    (id: string) => persist(activities.filter((a) => a.id !== id)),
    [activities, persist]
  );

  /** Map id -> activité, pratique pour retrouver les libellés/couleurs. */
  const byId = useMemo(
    () => new Map(activities.map((a) => [a.id, a])),
    [activities]
  );

  return {
    activities,
    byId,
    loading,
    addActivity,
    updateActivity,
    deleteActivity,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import { useProfileContext } from "@/context/ProfileContext";
import type { Activity } from "@/types";

/** Deux activités par défaut à la première utilisation d'un profil. */
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
 * Gère les activités du profil actif.
 * Recharge quand le profil change ; seed les deux activités par défaut si
 * le profil est vierge.
 */
export function useActivities() {
  const { activeProfileId } = useProfileContext();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    db.getActivities(activeProfileId).then((data) => {
      if (data.length === 0) {
        // Nouveau profil vierge : on installe les deux activités par défaut.
        setActivities(DEFAULT_ACTIVITIES);
        void db.saveActivities(activeProfileId, DEFAULT_ACTIVITIES);
      } else {
        setActivities(data);
      }
      setLoading(false);
    });
  }, [activeProfileId]);

  const persist = useCallback(
    (next: Activity[]) => {
      setActivities(next);
      if (activeProfileId) void db.saveActivities(activeProfileId, next);
    },
    [activeProfileId]
  );

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

  /** Map id -> activité, pour retrouver rapidement les libellés/couleurs. */
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

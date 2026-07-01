import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/services/storage";
import { groupSessionsByWeek, uid } from "@/lib/time";
import type { ActivityType, Session } from "@/types";

/**
 * Gère l'historique des sessions chronométrées.
 * Charge depuis la couche de persistance et expose des actions CRUD,
 * plus la vue dérivée regroupée par semaine.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  // Toute mutation persiste immédiatement puis met à jour l'état local.
  const persist = useCallback((next: Session[]) => {
    setSessions(next);
    void db.saveSessions(next);
  }, []);

  const addSession = useCallback(
    (activity: ActivityType, startedAt: number, durationSec: number) => {
      const session: Session = { id: uid(), activity, startedAt, durationSec };
      persist([session, ...sessions]);
    },
    [sessions, persist]
  );

  const deleteSession = useCallback(
    (id: string) => persist(sessions.filter((s) => s.id !== id)),
    [sessions, persist]
  );

  const weeks = useMemo(() => groupSessionsByWeek(sessions), [sessions]);

  return { sessions, weeks, loading, addSession, deleteSession };
}

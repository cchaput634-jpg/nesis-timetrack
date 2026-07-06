import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/services/storage";
import { groupSessionsByWeek, uid } from "@/lib/time";
import { useProfileContext } from "@/context/ProfileContext";
import type { Session } from "@/types";

/**
 * Gère l'historique des sessions chronométrées du profil actif.
 * Recharge automatiquement lorsque le profil change.
 */
export function useSessions() {
  const { activeProfileId } = useProfileContext();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    db.getSessions(activeProfileId).then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, [activeProfileId]);

  const persist = useCallback(
    (next: Session[]) => {
      setSessions(next);
      if (activeProfileId) void db.saveSessions(activeProfileId, next);
    },
    [activeProfileId]
  );

  const addSession = useCallback(
    (activity: string, startedAt: number, durationSec: number) => {
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

import { useCallback, useEffect, useRef, useState } from "react";

export type TimerStatus = "idle" | "running" | "paused";

/** Clé LocalStorage : le snapshot survit aux rechargements de page. */
const STORAGE_KEY = "tct.timer.v1";

/** Snapshot sérialisable du chrono. */
interface TimerSnapshot {
  status: TimerStatus;
  /** Secondes accumulées avant la reprise courante. */
  accumulated: number;
  /** Instant (epoch ms) de démarrage du segment en cours, ou null si pause. */
  startedAt: number | null;
  /** Instant (epoch ms) du tout premier démarrage de la session. */
  sessionStart: number | null;
}

const EMPTY: TimerSnapshot = {
  status: "idle",
  accumulated: 0,
  startedAt: null,
  sessionStart: null,
};

/** Lit le snapshot persisté (retombe silencieusement sur EMPTY si corrompu). */
function load(): TimerSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as TimerSnapshot;
    if (!parsed || typeof parsed !== "object") return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

function save(snap: TimerSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // Quota / mode privé — on ignore, l'app reste fonctionnelle en mémoire.
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignoré */
  }
}

/**
 * Chronomètre robuste basé sur l'horloge système (Date.now) plutôt que sur
 * un simple compteur d'intervalles : la durée reste juste même si l'onglet
 * est mis en veille ou si le rendu est ralenti.
 *
 * Le state est **persisté en LocalStorage** — un rechargement de page
 * (refresh navigateur, protection de bande passante mobile, mise en veille
 * qui recycle l'onglet…) restaure automatiquement le chrono en cours, avec
 * le temps qui a continué à s'écouler entre-temps si le statut était
 * `running`.
 */
export function useTimer() {
  // Snapshot initial synchrone : évite un flash à 00:00 avant l'effet.
  const initial = useRef<TimerSnapshot>(load()).current;

  const [status, setStatus] = useState<TimerStatus>(initial.status);
  const [elapsedSec, setElapsedSec] = useState(() => {
    // Recalcul du temps réel écoulé au moment du montage.
    let sec = initial.accumulated;
    if (initial.status === "running" && initial.startedAt != null) {
      sec += (Date.now() - initial.startedAt) / 1000;
    }
    return sec;
  });

  const accumulatedRef = useRef(initial.accumulated);
  const startedAtRef = useRef<number | null>(initial.startedAt);
  const sessionStartRef = useRef<number | null>(initial.sessionStart);
  const intervalRef = useRef<number | null>(null);

  const persistCurrent = useCallback((next: TimerStatus) => {
    save({
      status: next,
      accumulated: accumulatedRef.current,
      startedAt: startedAtRef.current,
      sessionStart: sessionStartRef.current,
    });
  }, []);

  const tick = useCallback(() => {
    if (startedAtRef.current == null) return;
    const delta = (Date.now() - startedAtRef.current) / 1000;
    setElapsedSec(accumulatedRef.current + delta);
  }, []);

  const clear = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Si on restaure un chrono qui était « running », on relance l'interval.
  useEffect(() => {
    if (status === "running" && intervalRef.current == null) {
      intervalRef.current = window.setInterval(tick, 250);
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (status === "running") return;
    const now = Date.now();
    if (sessionStartRef.current == null) sessionStartRef.current = now;
    startedAtRef.current = now;
    setStatus("running");
    clear();
    intervalRef.current = window.setInterval(tick, 250);
    persistCurrent("running");
  }, [status, tick, clear, persistCurrent]);

  const pause = useCallback(() => {
    if (status !== "running" || startedAtRef.current == null) return;
    accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    startedAtRef.current = null;
    clear();
    setStatus("paused");
    persistCurrent("paused");
  }, [status, clear, persistCurrent]);

  /** Réinitialise complètement le chrono et renvoie l'état final. */
  const reset = useCallback((): {
    durationSec: number;
    startedAt: number;
  } | null => {
    clear();
    let final = accumulatedRef.current;
    if (startedAtRef.current != null) {
      final += (Date.now() - startedAtRef.current) / 1000;
    }
    const startedAt = sessionStartRef.current;
    accumulatedRef.current = 0;
    startedAtRef.current = null;
    sessionStartRef.current = null;
    setElapsedSec(0);
    setStatus("idle");
    clearStorage();
    if (startedAt == null || final < 1) return null;
    return { durationSec: Math.round(final), startedAt };
  }, [clear]);

  return { status, elapsedSec, start, pause, reset };
}

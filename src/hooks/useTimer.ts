import { useCallback, useEffect, useRef, useState } from "react";

export type TimerStatus = "idle" | "running" | "paused";

/**
 * Chronomètre robuste basé sur l'horloge système (Date.now) plutôt que sur
 * un simple compteur d'intervalles : la durée reste juste même si l'onglet
 * est mis en veille ou si le rendu est ralenti.
 */
export function useTimer() {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);

  // Secondes déjà accumulées avant la reprise en cours, + instant de reprise.
  const accumulatedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  // Horodatage du tout premier lancement (pour dater la session).
  const sessionStartRef = useRef<number | null>(null);

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

  const start = useCallback(() => {
    if (status === "running") return;
    const now = Date.now();
    if (sessionStartRef.current == null) sessionStartRef.current = now;
    startedAtRef.current = now;
    setStatus("running");
    clear();
    intervalRef.current = window.setInterval(tick, 250);
  }, [status, tick, clear]);

  const pause = useCallback(() => {
    if (status !== "running" || startedAtRef.current == null) return;
    accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    startedAtRef.current = null;
    clear();
    setStatus("paused");
  }, [status, clear]);

  /** Réinitialise complètement le chrono et renvoie l'état final (durée + départ). */
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
    if (startedAt == null || final < 1) return null;
    return { durationSec: Math.round(final), startedAt };
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { status, elapsedSec, start, pause, reset };
}

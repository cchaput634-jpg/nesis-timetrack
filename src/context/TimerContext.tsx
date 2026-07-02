import { createContext, useContext, useState, type ReactNode } from "react";
import { useTimer, type TimerStatus } from "@/hooks/useTimer";

/**
 * Contexte global du chronomètre.
 *
 * Le state du timer (activité sélectionnée, statut, durée écoulée) est
 * remonté au niveau de l'app pour survivre au démontage de `TimerCard`
 * lorsqu'on change d'onglet. Sans ça, changer d'onglet remettait le chrono
 * à zéro et perdait la session en cours.
 */
interface TimerContextValue {
  /** Id de l'activité sélectionnée dans le sélecteur. */
  activityId: string;
  setActivityId: (id: string) => void;
  status: TimerStatus;
  elapsedSec: number;
  start: () => void;
  pause: () => void;
  /** Arrête le chrono et renvoie la durée + timestamp de démarrage. */
  reset: () => { durationSec: number; startedAt: number } | null;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [activityId, setActivityId] = useState<string>("");
  const timer = useTimer();
  return (
    <TimerContext.Provider
      value={{
        activityId,
        setActivityId,
        status: timer.status,
        elapsedSec: timer.elapsedSec,
        start: timer.start,
        pause: timer.pause,
        reset: timer.reset,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error(
      "useTimerContext doit être utilisé à l'intérieur d'un <TimerProvider>."
    );
  }
  return ctx;
}

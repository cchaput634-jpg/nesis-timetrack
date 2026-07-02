import type { Session, WeekGroup } from "@/types";

/** Génère un identifiant unique (crypto si dispo, sinon fallback). */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Formate un nombre de secondes en HH:MM:SS. */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Version compacte pour l'historique, ex. "2h 15m" ou "45m". */
export function formatCompact(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/**
 * Calcule le numéro de semaine ISO 8601 et l'année ISO d'une date.
 * (La semaine 1 est celle qui contient le premier jeudi de l'année.)
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // Jeudi de la semaine courante détermine l'année ISO.
  const dayNum = (d.getUTCDay() + 6) % 7; // lundi=0 … dimanche=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 +
    Math.round(
      (d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000)
    );
  return { year: d.getUTCFullYear(), week };
}

/** Retourne le lundi (début) de la semaine ISO d'une date donnée. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Libellé de plage "01 – 07 juil." pour une semaine. */
function formatRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  return `${fmt.format(monday)} – ${fmt.format(sunday)}`;
}

/**
 * Regroupe les sessions par semaine ISO et calcule les totaux
 * (total, SAV, démarchage). Trié de la semaine la plus récente à la plus ancienne.
 */
export function groupSessionsByWeek(sessions: Session[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();

  for (const session of sessions) {
    const date = new Date(session.startedAt);
    const { year, week } = getISOWeek(date);
    const weekKey = `${year}-W${week.toString().padStart(2, "0")}`;

    let group = map.get(weekKey);
    if (!group) {
      group = {
        weekKey,
        weekNumber: week,
        year,
        label: `Semaine ${week} · ${year}`,
        rangeLabel: formatRange(getMonday(date)),
        totalSec: 0,
        perActivitySec: {},
        sessions: [],
      };
      map.set(weekKey, group);
    }

    group.totalSec += session.durationSec;
    group.perActivitySec[session.activity] =
      (group.perActivitySec[session.activity] ?? 0) + session.durationSec;
    group.sessions.push(session);
  }

  // Sessions internes triées du plus récent au plus ancien.
  for (const group of map.values()) {
    group.sessions.sort((a, b) => b.startedAt - a.startedAt);
  }

  return Array.from(map.values()).sort((a, b) =>
    b.weekKey.localeCompare(a.weekKey)
  );
}

/** Date lisible d'une session, ex. "lun. 30 juin, 14:32". */
export function formatSessionDate(startedAt: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startedAt));
}

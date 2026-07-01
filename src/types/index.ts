/**
 * Modèle de données de l'application.
 * Deux domaines distincts : le suivi de temps (Session) et le CRM (Company/Contact).
 */

/* ------------------------------------------------------------------ */
/* Suivi de temps                                                      */
/* ------------------------------------------------------------------ */

/** Type d'activité chronométrée. */
export type ActivityType = "sav" | "demarchage";

/** Une session de travail chronométrée puis enregistrée. */
export interface Session {
  id: string;
  activity: ActivityType;
  /** Horodatage de démarrage (epoch ms) — sert au regroupement hebdomadaire. */
  startedAt: number;
  /** Durée totale de la session en secondes. */
  durationSec: number;
}

/**
 * Sessions agrégées par semaine ISO.
 * Objet dérivé (calculé à la volée), jamais persisté tel quel.
 */
export interface WeekGroup {
  /** Clé stable et triable, ex. "2026-W27". */
  weekKey: string;
  weekNumber: number;
  year: number;
  /** Libellé lisible, ex. "Semaine 27 · 2026". */
  label: string;
  /** Bornes de la semaine (pour affichage). */
  rangeLabel: string;
  totalSec: number;
  savSec: number;
  demarchageSec: number;
  sessions: Session[];
}

/* ------------------------------------------------------------------ */
/* CRM — Démarchage                                                    */
/* ------------------------------------------------------------------ */

/** Statut du lead dans le pipeline de démarchage. */
export type LeadStatus =
  | "nouveau"
  | "a_relancer"
  | "en_discussion"
  | "gagne"
  | "perdu";

/** Un contact rattaché à une entreprise. */
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** Date de dernier contact (ISO "YYYY-MM-DD") ou null si jamais contacté. */
  lastContactDate: string | null;
  /** Notes / historique spécifiques à ce contact. */
  notes: string;
}

/** Une entreprise démarchée, avec un ou plusieurs contacts. */
export interface Company {
  id: string;
  name: string;
  sector: string;
  status: LeadStatus;
  /** Notes globales sur l'entreprise. */
  notes: string;
  contacts: Contact[];
  createdAt: number;
}

/** Métadonnées d'affichage pour chaque statut de lead. */
export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; badgeClass: string }
> = {
  nouveau: {
    label: "Nouveau",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  a_relancer: {
    label: "À relancer",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  en_discussion: {
    label: "En discussion",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
  },
  gagne: {
    label: "Gagné",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  perdu: {
    label: "Perdu",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

/** Métadonnées d'affichage des activités chronométrées. */
export const ACTIVITY_META: Record<
  ActivityType,
  { label: string; color: string }
> = {
  // Démarchage : teal de marque ; SAV : charcoal de marque (contraste lisible).
  sav: { label: "SAV", color: "hsl(195 22% 30%)" },
  demarchage: { label: "Démarchage", color: "hsl(182 66% 37%)" },
};

/* ------------------------------------------------------------------ */
/* Notes (SAV / Démarchage)                                            */
/* ------------------------------------------------------------------ */

/** Catégorie d'une note : réutilise les deux mêmes domaines que le chrono. */
export type NoteCategory = ActivityType;

/**
 * Une note libre : un titre + un contenu riche (HTML simple, gras/souligné).
 * Rangée par catégorie dans deux onglets distincts.
 */
export interface Note {
  id: string;
  category: NoteCategory;
  title: string;
  /** Contenu HTML restreint (gras, souligné, sauts de ligne). */
  contentHtml: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Modèle de données de l'application.
 *
 * Toutes les données métier (activités, sessions, notes, entreprises,
 * interlocuteurs) sont **scopées par profil client** : chaque profil a
 * son propre espace 100 % isolé.
 */

/* ------------------------------------------------------------------ */
/* Profils clients                                                     */
/* ------------------------------------------------------------------ */

/** Un profil client : cloisonne toutes les données de l'app. */
export interface ClientProfile {
  id: string;
  name: string;
  /** Couleur d'identification dans le sélecteur (optionnel, une du palette). */
  color: string;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* Suivi de temps                                                      */
/* ------------------------------------------------------------------ */

/** Une activité chronométrée personnalisable (SAV, Démarchage, ou toute
 *  autre mission ajoutée par l'utilisateur). */
export interface Activity {
  id: string;
  label: string;
  /** Couleur (CSS) associée à l'activité dans les graphes et badges. */
  color: string;
  createdAt: number;
  updatedAt: number;
}

/** Une session de travail chronométrée puis enregistrée.
 *  `activity` référence l'`Activity.id` — laissé en `string` pour rester
 *  robuste si l'activité est renommée ou supprimée par la suite. */
export interface Session {
  id: string;
  activity: string;
  /** Horodatage de démarrage (epoch ms) — sert au regroupement hebdomadaire. */
  startedAt: number;
  /** Durée totale de la session en secondes. */
  durationSec: number;
}

/** Palette de couleurs proposée à l'utilisateur lors de la création/édition
 *  d'une activité (teal de marque en premier, puis complémentaires). */
export const ACTIVITY_COLOR_PALETTE = [
  "hsl(182 66% 37%)", // teal (marque)
  "hsl(195 22% 30%)", // charcoal
  "hsl(221 83% 53%)", // bleu
  "hsl(160 84% 39%)", // vert
  "hsl(45 93% 47%)",  // ambre
  "hsl(24 90% 50%)",  // orange
  "hsl(346 84% 55%)", // rose
  "hsl(280 65% 55%)", // violet
] as const;

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
  /** Total de secondes par id d'activité (dynamique, dépend des activités
   *  utilisées cette semaine). */
  perActivitySec: Record<string, number>;
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

/* ------------------------------------------------------------------ */
/* Notes (SAV / Démarchage)                                            */
/* ------------------------------------------------------------------ */

/** Catégorie d'une note — reste fixée à SAV/Démarchage, indépendante
 *  des activités personnalisables du chrono. */
export type NoteCategory = "sav" | "demarchage";

/** Libellés/couleurs des deux catégories de notes. */
export const NOTE_CATEGORY_META: Record<
  NoteCategory,
  { label: string; color: string }
> = {
  sav: { label: "SAV", color: "hsl(195 22% 30%)" },
  demarchage: { label: "Démarchage", color: "hsl(182 66% 37%)" },
};

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
  /** Nom de groupe libre (vide = « Sans groupe »). Optionnel pour les
   *  anciennes notes créées avant l'ajout de cette fonctionnalité. */
  groupName?: string;
  /** Position manuelle dans le groupe (croissant). Optionnel : fallback
   *  sur `-updatedAt` pour les notes antérieures. */
  sortOrder?: number;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* Info client                                                         */
/* ------------------------------------------------------------------ */

/** Fiche d'informations d'un client (indépendante du CRM entreprises). */
export interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  /** Poste / fonction. */
  role: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

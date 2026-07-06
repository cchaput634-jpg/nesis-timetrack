import type {
  Activity,
  ClientInfo,
  ClientProfile,
  Company,
  Note,
  Notebook,
  Session,
} from "@/types";

/**
 * Couche d'abstraction de persistance, **scopée par profil client**.
 *
 * L'implémentation par défaut (`HybridAdapter`) synchronise avec la base
 * **Cloudflare D1** via l'API du Worker et conserve un cache LocalStorage.
 *
 * - Les profils sont GLOBAUX (une seule liste, exposée sans profileId).
 * - Toutes les autres collections sont ISOLÉES par profil : chaque profil
 *   a ses activités, sessions, notes, entreprises et interlocuteurs à lui.
 */
export interface StorageAdapter {
  /* --- Profils (non scopés) --- */
  getProfiles(): Promise<ClientProfile[]>;
  saveProfiles(profiles: ClientProfile[]): Promise<void>;
  /** Rattache toutes les lignes orphelines D1 (profileId='') au profil
   *  demandé. Idempotent. Utilisé pour migrer les données pré-multi-profils. */
  adoptOrphans(profileId: string): Promise<void>;

  /* --- Collections scopées par profil --- */
  getSessions(profileId: string): Promise<Session[]>;
  saveSessions(profileId: string, sessions: Session[]): Promise<void>;
  getCompanies(profileId: string): Promise<Company[]>;
  saveCompanies(profileId: string, companies: Company[]): Promise<void>;
  getNotes(profileId: string): Promise<Note[]>;
  saveNotes(profileId: string, notes: Note[]): Promise<void>;
  getClients(profileId: string): Promise<ClientInfo[]>;
  saveClients(profileId: string, clients: ClientInfo[]): Promise<void>;
  getActivities(profileId: string): Promise<Activity[]>;
  saveActivities(profileId: string, activities: Activity[]): Promise<void>;
  getNotebooks(profileId: string): Promise<Notebook[]>;
  saveNotebooks(profileId: string, notebooks: Notebook[]): Promise<void>;
}

/** Collections stockées côté API et LocalStorage. */
type Collection =
  | "sessions"
  | "companies"
  | "notes"
  | "clients"
  | "activities"
  | "notebooks";

/** Ensemble des collections scopées par profil (les profiles ne le sont pas). */

const KEYS: Record<Collection, string> = {
  sessions: "tct.sessions.v2",
  companies: "tct.companies.v2",
  notes: "tct.notes.v2",
  clients: "tct.clients.v2",
  activities: "tct.activities.v2",
  notebooks: "tct.notebooks.v1",
};
const PROFILES_KEY = "tct.profiles.v1";

/* ------------------------------------------------------------------ */
/* Cache local (LocalStorage)                                          */
/* ------------------------------------------------------------------ */

/** Clé LocalStorage complète pour une collection scopée. */
function scopedKey(collection: Collection, profileId: string): string {
  return `${KEYS[collection]}.${profileId}`;
}

function readLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / mode privé — on tolère */
  }
}

/* ------------------------------------------------------------------ */
/* Client API du Worker Cloudflare (D1)                                */
/* ------------------------------------------------------------------ */

/** Base de l'API : proxy Vite en dev, URL Worker en prod. */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

async function apiGet<T>(
  collection: Collection | "profiles",
  profileId?: string
): Promise<T[]> {
  const qs = profileId ? `?profile=${encodeURIComponent(profileId)}` : "";
  const res = await fetch(`${API_BASE}/${collection}${qs}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`GET ${collection} → ${res.status}`);
  return (await res.json()) as T[];
}

async function apiPut<T>(
  collection: Collection | "profiles",
  data: T[],
  profileId?: string
): Promise<void> {
  const qs = profileId ? `?profile=${encodeURIComponent(profileId)}` : "";
  const res = await fetch(`${API_BASE}/${collection}${qs}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PUT ${collection} → ${res.status}`);
}

/* ------------------------------------------------------------------ */
/* Adaptateur hybride : D1 en source de vérité + cache local           */
/* ------------------------------------------------------------------ */

/** Marqueur LocalStorage : ce navigateur a-t-il déjà réussi à synchroniser
 *  cette collection avec D1 au moins une fois ? Empêche toute migration
 *  répétée (qui « ressusciterait » les éléments supprimés depuis un autre
 *  appareil). Un flag par collection ET par profil. */
const SYNC_FLAG_PREFIX = "tct.synced.v2.";

class HybridAdapter implements StorageAdapter {
  /* ---------------- Profils (non scopés) ---------------- */

  async getProfiles(): Promise<ClientProfile[]> {
    const local = readLocal<ClientProfile>(PROFILES_KEY);
    const flagKey = `${SYNC_FLAG_PREFIX}profiles`;
    const hasSynced = localStorage.getItem(flagKey) === "1";
    try {
      const remote = await apiGet<ClientProfile>("profiles");
      if (!hasSynced && remote.length === 0 && local.length > 0) {
        try {
          await apiPut("profiles", local);
        } catch (err) {
          console.warn("Migration D1 échouée (profiles)", err);
        }
        localStorage.setItem(flagKey, "1");
        return local;
      }
      localStorage.setItem(flagKey, "1");
      writeLocal(PROFILES_KEY, remote);
      return remote;
    } catch {
      return local;
    }
  }

  async saveProfiles(profiles: ClientProfile[]): Promise<void> {
    writeLocal(PROFILES_KEY, profiles);
    try {
      await apiPut("profiles", profiles);
    } catch (err) {
      console.warn("Sync D1 différée (profiles)", err);
    }
  }

  async adoptOrphans(profileId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE}/adopt-orphans?profile=${encodeURIComponent(profileId)}`,
      { method: "POST" }
    );
    if (!res.ok) {
      throw new Error(`adopt-orphans → ${res.status}`);
    }
  }

  /* ---------------- Collections scopées par profil ---------------- */

  /**
   * Lecture : tente D1 pour ce profil ; en cas d'échec, retombe sur le
   * cache local (aussi scopé). Migration one-shot par (collection, profil).
   */
  private async load<T>(
    collection: Collection,
    profileId: string
  ): Promise<T[]> {
    const key = scopedKey(collection, profileId);
    const local = readLocal<T>(key);
    const flagKey = `${SYNC_FLAG_PREFIX}${collection}.${profileId}`;
    const hasSynced = localStorage.getItem(flagKey) === "1";

    try {
      const remote = await apiGet<T>(collection, profileId);
      if (!hasSynced && remote.length === 0 && local.length > 0) {
        try {
          await apiPut(collection, local, profileId);
        } catch (err) {
          console.warn(`Migration D1 échouée (${collection})`, err);
        }
        localStorage.setItem(flagKey, "1");
        return local;
      }
      localStorage.setItem(flagKey, "1");
      writeLocal(key, remote);
      return remote;
    } catch {
      return local;
    }
  }

  /** Écriture : cache local immédiat + push D1 en best-effort. */
  private async store<T>(
    collection: Collection,
    profileId: string,
    data: T[]
  ): Promise<void> {
    writeLocal(scopedKey(collection, profileId), data);
    try {
      await apiPut(collection, data, profileId);
    } catch (err) {
      console.warn(`Sync D1 différée (${collection})`, err);
    }
  }

  getSessions(profileId: string) {
    return this.load<Session>("sessions", profileId);
  }
  saveSessions(profileId: string, sessions: Session[]) {
    return this.store("sessions", profileId, sessions);
  }
  getCompanies(profileId: string) {
    return this.load<Company>("companies", profileId);
  }
  saveCompanies(profileId: string, companies: Company[]) {
    return this.store("companies", profileId, companies);
  }
  getNotes(profileId: string) {
    return this.load<Note>("notes", profileId);
  }
  saveNotes(profileId: string, notes: Note[]) {
    return this.store("notes", profileId, notes);
  }
  getClients(profileId: string) {
    return this.load<ClientInfo>("clients", profileId);
  }
  saveClients(profileId: string, clients: ClientInfo[]) {
    return this.store("clients", profileId, clients);
  }
  getActivities(profileId: string) {
    return this.load<Activity>("activities", profileId);
  }
  saveActivities(profileId: string, activities: Activity[]) {
    return this.store("activities", profileId, activities);
  }
  getNotebooks(profileId: string) {
    return this.load<Notebook>("notebooks", profileId);
  }
  saveNotebooks(profileId: string, notebooks: Notebook[]) {
    return this.store("notebooks", profileId, notebooks);
  }
}

/** Singleton consommé par tous les hooks. */
export const db: StorageAdapter = new HybridAdapter();

import type { Activity, ClientInfo, Company, Note, Session } from "@/types";

/**
 * Couche d'abstraction de persistance.
 *
 * Toute l'application passe par cette interface. L'implémentation par défaut
 * (`HybridAdapter`) synchronise avec la base **Cloudflare D1** via l'API du
 * Worker (`/api/*`), tout en conservant un cache LocalStorage : l'app reste
 * donc fonctionnelle même hors-ligne ou si le backend n'est pas démarré.
 *
 * L'interface est asynchrone : brancher un autre backend = écrire une
 * nouvelle classe et changer l'export `db` en bas de fichier.
 */
export interface StorageAdapter {
  getSessions(): Promise<Session[]>;
  saveSessions(sessions: Session[]): Promise<void>;
  getCompanies(): Promise<Company[]>;
  saveCompanies(companies: Company[]): Promise<void>;
  getNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
  getClients(): Promise<ClientInfo[]>;
  saveClients(clients: ClientInfo[]): Promise<void>;
  getActivities(): Promise<Activity[]>;
  saveActivities(activities: Activity[]): Promise<void>;
}

/** Collections persistées ; sert de clés d'API et de LocalStorage. */
type Collection =
  | "sessions"
  | "companies"
  | "notes"
  | "clients"
  | "activities";

const KEYS: Record<Collection, string> = {
  sessions: "tct.sessions.v1",
  companies: "tct.companies.v1",
  notes: "tct.notes.v1",
  clients: "tct.clients.v1",
  activities: "tct.activities.v1",
};

/* ------------------------------------------------------------------ */
/* Cache local (LocalStorage)                                          */
/* ------------------------------------------------------------------ */

function readLocal<T>(collection: Collection): T[] {
  try {
    const raw = localStorage.getItem(KEYS[collection]);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(collection: Collection, value: T[]): void {
  localStorage.setItem(KEYS[collection], JSON.stringify(value));
}

/* ------------------------------------------------------------------ */
/* Client API du Worker Cloudflare (D1)                                */
/* ------------------------------------------------------------------ */

/** Base de l'API : proxy Vite en dev, même origine en prod. */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

async function apiGet<T>(collection: Collection): Promise<T[]> {
  const res = await fetch(`${API_BASE}/${collection}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`GET ${collection} → ${res.status}`);
  return (await res.json()) as T[];
}

async function apiPut<T>(collection: Collection, data: T[]): Promise<void> {
  const res = await fetch(`${API_BASE}/${collection}`, {
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
 *  appareil). Une valeur par collection car chacune peut arriver
 *  indépendamment à un premier sync réussi. */
const SYNC_FLAG_PREFIX = "tct.synced.v1.";

class HybridAdapter implements StorageAdapter {
  /**
   * Lecture : tente D1 ; en cas d'échec (offline, backend arrêté),
   * retombe sur le cache local. Une lecture D1 réussie rafraîchit le cache.
   *
   * **Migration one-shot par appareil** : uniquement au tout premier sync
   * réussi de ce navigateur, si la base D1 est vide et que le cache local
   * a des données, on pousse ces données locales vers D1 (rattrapage de
   * l'ancien mode LocalStorage seul).
   *
   * Une fois le flag `tct.synced.v1.<collection>` posé, ce navigateur
   * considère D1 comme la source de vérité et ne re-uploade JAMAIS son
   * cache local — sinon supprimer un élément depuis un autre appareil
   * serait annulé au prochain chargement.
   */
  private async load<T>(collection: Collection): Promise<T[]> {
    const local = readLocal<T>(collection);
    const flagKey = `${SYNC_FLAG_PREFIX}${collection}`;
    const hasSynced =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(flagKey) === "1";

    try {
      const remote = await apiGet<T>(collection);

      if (!hasSynced && remote.length === 0 && local.length > 0) {
        // Migration one-shot : ce navigateur n'a jamais sync et a des
        // données locales à faire remonter.
        try {
          await apiPut(collection, local);
        } catch (err) {
          console.warn(`Migration D1 échouée (${collection})`, err);
        }
        try {
          localStorage.setItem(flagKey, "1");
        } catch {
          /* stockage indispo — on tolère, on réessaiera au prochain chargement */
        }
        return local;
      }

      // Sync ordinaire : D1 fait autorité, le cache local est réaligné.
      try {
        localStorage.setItem(flagKey, "1");
      } catch {
        /* idem */
      }
      writeLocal(collection, remote);
      return remote;
    } catch {
      return local;
    }
  }

  /**
   * Écriture : met à jour le cache local immédiatement (réactivité),
   * puis pousse vers D1 en best-effort (sans bloquer l'UI).
   */
  private async store<T>(collection: Collection, data: T[]): Promise<void> {
    writeLocal(collection, data);
    try {
      await apiPut(collection, data);
    } catch (err) {
      // Backend indisponible : la donnée reste en cache local et sera
      // resynchronisée à la prochaine écriture réussie.
      console.warn(`Sync D1 différée (${collection})`, err);
    }
  }

  getSessions() {
    return this.load<Session>("sessions");
  }
  saveSessions(sessions: Session[]) {
    return this.store("sessions", sessions);
  }
  getCompanies() {
    return this.load<Company>("companies");
  }
  saveCompanies(companies: Company[]) {
    return this.store("companies", companies);
  }
  getNotes() {
    return this.load<Note>("notes");
  }
  saveNotes(notes: Note[]) {
    return this.store("notes", notes);
  }
  getClients() {
    return this.load<ClientInfo>("clients");
  }
  saveClients(clients: ClientInfo[]) {
    return this.store("clients", clients);
  }
  getActivities() {
    return this.load<Activity>("activities");
  }
  saveActivities(activities: Activity[]) {
    return this.store("activities", activities);
  }
}

/** Singleton consommé par tous les hooks. */
export const db: StorageAdapter = new HybridAdapter();

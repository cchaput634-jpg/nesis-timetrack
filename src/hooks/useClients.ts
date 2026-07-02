import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import type { ClientInfo } from "@/types";

type ClientPatch = Partial<
  Pick<ClientInfo, "firstName" | "lastName" | "role" | "phone" | "email" | "notes">
>;

/** Gère les fiches « Info client » : CRUD + persistance (D1 + cache local). */
export function useClients() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getClients().then((data) => {
      setClients(data);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: ClientInfo[]) => {
    setClients(next);
    void db.saveClients(next);
  }, []);

  const addClient = useCallback((): ClientInfo => {
    const now = Date.now();
    const client: ClientInfo = {
      id: uid(),
      firstName: "",
      lastName: "",
      role: "",
      phone: "",
      email: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    persist([client, ...clients]);
    return client;
  }, [clients, persist]);

  const updateClient = useCallback(
    (id: string, patch: ClientPatch) =>
      persist(
        clients.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
        )
      ),
    [clients, persist]
  );

  const deleteClient = useCallback(
    (id: string) => persist(clients.filter((c) => c.id !== id)),
    [clients, persist]
  );

  // Plus récemment modifiés en premier.
  const sorted = useMemo(
    () => [...clients].sort((a, b) => b.updatedAt - a.updatedAt),
    [clients]
  );

  return { clients: sorted, loading, addClient, updateClient, deleteClient };
}

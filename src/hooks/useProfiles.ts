import { useCallback, useEffect, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import type { ClientProfile } from "@/types";
import { ACTIVITY_COLOR_PALETTE } from "@/types";

type ProfilePatch = Partial<Pick<ClientProfile, "name" | "color">>;

/** Gère la liste des profils clients + CRUD. */
export function useProfiles() {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getProfiles().then((data) => {
      setProfiles(data);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: ClientProfile[]) => {
    setProfiles(next);
    void db.saveProfiles(next);
  }, []);

  const addProfile = useCallback(
    (name: string): ClientProfile => {
      const now = Date.now();
      const used = new Set(profiles.map((p) => p.color));
      const color =
        ACTIVITY_COLOR_PALETTE.find((c) => !used.has(c)) ??
        ACTIVITY_COLOR_PALETTE[0];
      const profile: ClientProfile = {
        id: uid(),
        name,
        color,
        createdAt: now,
        updatedAt: now,
      };
      persist([...profiles, profile]);
      return profile;
    },
    [profiles, persist]
  );

  const updateProfile = useCallback(
    (id: string, patch: ProfilePatch) =>
      persist(
        profiles.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
        )
      ),
    [profiles, persist]
  );

  const deleteProfile = useCallback(
    (id: string) => persist(profiles.filter((p) => p.id !== id)),
    [profiles, persist]
  );

  return {
    profiles,
    loading,
    addProfile,
    updateProfile,
    deleteProfile,
  };
}

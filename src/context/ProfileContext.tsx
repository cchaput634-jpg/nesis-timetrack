import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useProfiles } from "@/hooks/useProfiles";
import { db } from "@/services/storage";
import type { ClientProfile } from "@/types";

/** Clé LocalStorage : profil actif (survit aux rechargements). */
const ACTIVE_PROFILE_KEY = "tct.activeProfile.v1";

interface ProfileContextValue {
  profiles: ClientProfile[];
  activeProfile: ClientProfile | null;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  addProfile: (name: string) => ClientProfile;
  updateProfile: (
    id: string,
    patch: Partial<Pick<ClientProfile, "name" | "color">>
  ) => void;
  deleteProfile: (id: string) => void;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Fournit à toute l'app la notion de « profil client actif ».
 * Les hooks qui chargent des données (sessions, notes, etc.) écoutent
 * `activeProfileId` et rechargent quand il change.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { profiles, loading, addProfile, updateProfile, deleteProfile } =
    useProfiles();
  const [activeProfileId, setActiveProfileIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_PROFILE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const setActiveProfileId = useCallback((id: string) => {
    setActiveProfileIdState(id);
    try {
      if (id) localStorage.setItem(ACTIVE_PROFILE_KEY, id);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
    } catch {
      /* mode privé — ignoré */
    }
  }, []);

  // Empêche la double exécution de l'amorçage (StrictMode en dev ré-appelle
  // les effets ; on ne veut pas créer deux profils « Maddyness »).
  const bootstrapping = useRef(false);

  /**
   * Amorçage :
   * - S'il n'y a AUCUN profil (premier lancement de la version multi-profils),
   *   on en crée un nommé « Maddyness », on adopte les lignes orphelines D1
   *   (préexistantes avant l'introduction des profils), puis on active le
   *   profil. La migration se fait AVANT l'activation pour que les autres
   *   hooks voient les données rattachées à leur premier GET.
   * - Sinon, si le profil actif stocké n'existe plus, on retombe sur le
   *   premier disponible.
   */
  useEffect(() => {
    if (loading) return;
    if (bootstrapping.current) return;

    if (profiles.length === 0) {
      bootstrapping.current = true;
      const first = addProfile("Maddyness");
      db.adoptOrphans(first.id)
        .catch((err) =>
          console.warn("Adoption des lignes orphelines échouée", err)
        )
        .finally(() => {
          setActiveProfileId(first.id);
        });
      return;
    }
    if (!profiles.some((p) => p.id === activeProfileId)) {
      setActiveProfileId(profiles[0].id);
    }
  }, [loading, profiles, activeProfileId, addProfile, setActiveProfileId]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  );

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        activeProfileId,
        setActiveProfileId,
        addProfile,
        updateProfile,
        deleteProfile,
        loading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error(
      "useProfileContext doit être utilisé à l'intérieur d'un <ProfileProvider>."
    );
  }
  return ctx;
}

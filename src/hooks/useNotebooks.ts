import { useCallback, useEffect, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import { useProfileContext } from "@/context/ProfileContext";
import { DEFAULT_NOTEBOOK_IDS, type Notebook } from "@/types";

type NotebookPatch = Partial<Pick<Notebook, "name">>;

/** Cahiers par défaut à la première utilisation d'un profil. Les `id` sont
 *  stables (`"sav"`, `"demarchage"`) car les notes historiques Maddyness
 *  ont leur `category` qui pointe déjà vers ces valeurs — les préserver
 *  garde ces notes rattachées à leur cahier d'origine. */
function makeDefaultNotebooks(): Notebook[] {
  const now = Date.now();
  return [
    {
      id: DEFAULT_NOTEBOOK_IDS.sav,
      name: "SAV",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_NOTEBOOK_IDS.demarchage,
      name: "Démarchage",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Gère les cahiers de notes du profil actif.
 * Seede automatiquement deux cahiers (SAV, Démarchage) à la première
 * utilisation d'un nouveau profil, avec des ids stables pour préserver
 * la compatibilité des notes historiques.
 */
export function useNotebooks() {
  const { activeProfileId } = useProfileContext();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    db.getNotebooks(activeProfileId).then((data) => {
      if (data.length === 0) {
        const seed = makeDefaultNotebooks();
        setNotebooks(seed);
        void db.saveNotebooks(activeProfileId, seed);
      } else {
        setNotebooks(data);
      }
      setLoading(false);
    });
  }, [activeProfileId]);

  const persist = useCallback(
    (next: Notebook[]) => {
      setNotebooks(next);
      if (activeProfileId) void db.saveNotebooks(activeProfileId, next);
    },
    [activeProfileId]
  );

  const addNotebook = useCallback(
    (name: string): Notebook => {
      const now = Date.now();
      const notebook: Notebook = {
        id: uid(),
        name,
        createdAt: now,
        updatedAt: now,
      };
      persist([...notebooks, notebook]);
      return notebook;
    },
    [notebooks, persist]
  );

  const updateNotebook = useCallback(
    (id: string, patch: NotebookPatch) =>
      persist(
        notebooks.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
        )
      ),
    [notebooks, persist]
  );

  const deleteNotebook = useCallback(
    (id: string) => persist(notebooks.filter((n) => n.id !== id)),
    [notebooks, persist]
  );

  return {
    notebooks,
    loading,
    addNotebook,
    updateNotebook,
    deleteNotebook,
  };
}

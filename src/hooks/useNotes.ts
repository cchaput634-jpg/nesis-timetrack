import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import { useProfileContext } from "@/context/ProfileContext";
import type { Note, NoteCategory } from "@/types";

/** Note « normalisée » : groupName et sortOrder toujours définis. */
interface NormalizedNote extends Note {
  groupName: string;
  sortOrder: number;
}

/** Un groupe de notes affiché sous un même en-tête. */
export interface NoteGroup {
  name: string;
  notes: NormalizedNote[];
}

/**
 * Gère les notes d'une catégorie donnée (SAV ou Démarchage).
 * Vue dérivée par groupe avec ordre manuel (flèches ↑↓).
 */
export function useNotes(category: NoteCategory) {
  const { activeProfileId } = useProfileContext();
  const [all, setAll] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    db.getNotes(activeProfileId).then((data) => {
      setAll(data);
      setLoading(false);
    });
  }, [activeProfileId]);

  const persist = useCallback(
    (next: Note[]) => {
      setAll(next);
      if (activeProfileId) void db.saveNotes(activeProfileId, next);
    },
    [activeProfileId]
  );

  /**
   * Notes de la catégorie, avec valeurs par défaut pour `groupName` et
   * `sortOrder` (rétrocompat : les notes créées avant l'ajout de ces
   * champs prennent -updatedAt comme ordre, ce qui les affiche du plus
   * récent au plus ancien).
   */
  const notes = useMemo<NormalizedNote[]>(
    () =>
      all
        .filter((n) => n.category === category)
        .map((n) => ({
          ...n,
          groupName: n.groupName ?? "",
          sortOrder: n.sortOrder ?? -n.updatedAt,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [all, category]
  );

  /** Notes regroupées par `groupName`, groupes triés par ordre d'apparition. */
  const groups = useMemo<NoteGroup[]>(() => {
    const map = new Map<string, NormalizedNote[]>();
    for (const n of notes) {
      if (!map.has(n.groupName)) map.set(n.groupName, []);
      map.get(n.groupName)!.push(n);
    }
    return Array.from(map, ([name, notes]) => ({ name, notes }));
  }, [notes]);

  /** Liste des noms de groupes existants (pour l'autocomplete du datalist). */
  const groupNames = useMemo(
    () => Array.from(new Set(notes.map((n) => n.groupName).filter(Boolean))),
    [notes]
  );

  const addNote = useCallback((): Note => {
    const now = Date.now();
    // Nouvelle note = sortOrder minimum → apparaît en tête de son groupe.
    const minOrder = notes.reduce(
      (m, n) => Math.min(m, n.sortOrder),
      0
    );
    const note: Note = {
      id: uid(),
      category,
      title: "",
      contentHtml: "",
      groupName: "",
      sortOrder: minOrder - 1,
      createdAt: now,
      updatedAt: now,
    };
    persist([note, ...all]);
    return note;
  }, [all, notes, category, persist]);

  const updateNote = useCallback(
    (
      id: string,
      patch: Partial<Pick<Note, "title" | "contentHtml" | "groupName">>
    ) =>
      persist(
        all.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
        )
      ),
    [all, persist]
  );

  const deleteNote = useCallback(
    (id: string) => persist(all.filter((n) => n.id !== id)),
    [all, persist]
  );

  /**
   * Déplace une note d'un cran (haut/bas) au sein de son groupe en
   * échangeant son `sortOrder` avec celui du voisin immédiat.
   */
  const moveNote = useCallback(
    (id: string, direction: "up" | "down") => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      const siblings = notes.filter((n) => n.groupName === target.groupName);
      const idx = siblings.findIndex((n) => n.id === id);
      const swapWith = siblings[direction === "up" ? idx - 1 : idx + 1];
      if (!swapWith) return;

      persist(
        all.map((n) => {
          if (n.id === target.id) return { ...n, sortOrder: swapWith.sortOrder };
          if (n.id === swapWith.id) return { ...n, sortOrder: target.sortOrder };
          return n;
        })
      );
    },
    [all, notes, persist]
  );

  /**
   * Insère la note `sourceId` à la position `destIndex` (index dans le groupe
   * cible **excluant** la source) du groupe `destGroup`. Renumérote ensuite
   * les `sortOrder` de toute la catégorie pour préserver un ordre stable.
   * Utilisé par le drag-and-drop pour les déplacements inter-groupes.
   */
  const reorderNotes = useCallback(
    (sourceId: string, destGroup: string, destIndex: number) => {
      // Aplati ordonné (par groupe) de la catégorie, en retirant la source.
      const withoutSource: { groupName: string; note: NormalizedNote }[] = [];
      let source: NormalizedNote | null = null;
      for (const g of groups) {
        for (const n of g.notes) {
          if (n.id === sourceId) source = n;
          else withoutSource.push({ groupName: g.name, note: n });
        }
      }
      if (!source) return;

      // Cherche l'index absolu où insérer : avant la `destIndex`-ième
      // note du groupe cible, ou à la fin si le groupe n'existe pas encore.
      let insertAt = withoutSource.length;
      let seenInDest = 0;
      for (let i = 0; i < withoutSource.length; i++) {
        if (withoutSource[i].groupName === destGroup) {
          if (seenInDest === destIndex) {
            insertAt = i;
            break;
          }
          seenInDest++;
        }
      }
      withoutSource.splice(insertAt, 0, {
        groupName: destGroup,
        note: { ...source, groupName: destGroup },
      });

      // Nouvelle sortOrder = position absolue dans l'aplati.
      const patches = new Map<string, { sortOrder: number; groupName: string }>();
      withoutSource.forEach((item, i) => {
        patches.set(item.note.id, {
          sortOrder: i,
          groupName: item.groupName,
        });
      });

      const now = Date.now();
      persist(
        all.map((n) => {
          const patch = patches.get(n.id);
          if (!patch) return n;
          // updatedAt uniquement pour la source (celle qui change réellement).
          return n.id === sourceId
            ? { ...n, ...patch, updatedAt: now }
            : { ...n, ...patch };
        })
      );
    },
    [all, groups, persist]
  );

  return {
    notes,
    groups,
    groupNames,
    loading,
    addNote,
    updateNote,
    deleteNote,
    moveNote,
    reorderNotes,
  };
}

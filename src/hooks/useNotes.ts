import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import type { Note, NoteCategory } from "@/types";

/**
 * Gère les notes d'une catégorie donnée (SAV ou Démarchage).
 * Les notes des deux catégories partagent le même stockage ; ce hook
 * n'expose et ne modifie que celles de la catégorie demandée.
 */
export function useNotes(category: NoteCategory) {
  const [all, setAll] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getNotes().then((data) => {
      setAll(data);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: Note[]) => {
    setAll(next);
    void db.saveNotes(next);
  }, []);

  // Notes de la catégorie courante, plus récemment modifiées en premier.
  const notes = useMemo(
    () =>
      all
        .filter((n) => n.category === category)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [all, category]
  );

  const addNote = useCallback((): Note => {
    const now = Date.now();
    const note: Note = {
      id: uid(),
      category,
      title: "",
      contentHtml: "",
      createdAt: now,
      updatedAt: now,
    };
    persist([note, ...all]);
    return note;
  }, [all, category, persist]);

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<Note, "title" | "contentHtml">>) =>
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

  return { notes, loading, addNote, updateNote, deleteNote };
}

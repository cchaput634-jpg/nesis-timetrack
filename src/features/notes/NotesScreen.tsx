import { useState } from "react";
import { Plus, StickyNote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoteCard } from "./NoteCard";
import { useNotes } from "@/hooks/useNotes";
import { ACTIVITY_META, type NoteCategory } from "@/types";

interface NotesScreenProps {
  category: NoteCategory;
}

/**
 * Écran de notes d'une catégorie (SAV ou Démarchage).
 * Notes pleine largeur « titre + texte riche », en lecture par défaut.
 */
export function NotesScreen({ category }: NotesScreenProps) {
  const { notes, addNote, updateNote, deleteNote } = useNotes(category);
  const label = ACTIVITY_META[category].label;
  // Id de la note tout juste créée → ouverte directement en édition.
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  const handleCreate = () => setNewlyCreatedId(addNote().id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {notes.length} note{notes.length > 1 ? "s" : ""} · {label}
        </p>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Nouvelle note
        </Button>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <StickyNote className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              Aucune note {label}. Créez-en une pour consigner un titre et un
              contenu.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <NoteCard
                  note={note}
                  startEditing={note.id === newlyCreatedId}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Trash2, Clock, Pencil, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { Note } from "@/types";

interface NoteCardProps {
  note: Note;
  /** Ouvre la note directement en édition (ex. juste après création). */
  startEditing?: boolean;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Note, "title" | "contentHtml">>
  ) => void;
  onDelete: (id: string) => void;
}

/**
 * Carte d'une note occupant toute la largeur.
 * Par défaut en **mode lecture** (pas d'édition accidentelle) ; on bascule
 * en édition via « Modifier », et « Terminé » repasse en lecture.
 */
export function NoteCard({
  note,
  startEditing = false,
  onUpdate,
  onDelete,
}: NoteCardProps) {
  const [editing, setEditing] = useState(startEditing);
  const [title, setTitle] = useState(note.title);
  // Dernier contenu HTML connu (mis à jour à chaque frappe, non débouncé).
  const contentRef = useRef(note.contentHtml);
  const timer = useRef<number | null>(null);

  // Débounce des écritures pour ne pas persister à chaque frappe
  // (utile surtout avec le backend réseau D1).
  const debouncedUpdate = (
    patch: Partial<Pick<Note, "title" | "contentHtml">>
  ) => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onUpdate(note.id, patch), 400);
  };

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    []
  );

  // Repasse en lecture en persistant immédiatement le dernier état.
  const finishEditing = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    onUpdate(note.id, { title, contentHtml: contentRef.current });
    setEditing(false);
  };

  return (
    <Card className="p-4 sm:p-6">
      {/* En-tête : titre + actions */}
      <div className="mb-3 flex items-start gap-2">
        {editing ? (
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              debouncedUpdate({ title: e.target.value });
            }}
            placeholder="Titre de la note"
            className="border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        ) : (
          <h3 className="flex-1 text-lg font-semibold">
            {title || (
              <span className="text-muted-foreground">Note sans titre</span>
            )}
          </h3>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <Button size="sm" onClick={finishEditing}>
              <Check className="h-4 w-4" />
              Terminé
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(note.id)}
            aria-label="Supprimer la note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Corps : éditeur en édition, contenu rendu en lecture */}
      {editing ? (
        <RichTextEditor
          key={note.id}
          initialHtml={note.contentHtml}
          onChange={(html) => {
            contentRef.current = html;
            debouncedUpdate({ contentHtml: html });
          }}
          placeholder="Contenu de la note… (sélectionnez du texte puis gras / souligné / rouge)"
        />
      ) : note.contentHtml.replace(/<[^>]*>/g, "").trim() ? (
        <div
          className="note-content min-h-[80px] text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: note.contentHtml }}
        />
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Note vide — cliquez sur « Modifier » pour ajouter du contenu.
        </p>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Modifiée le{" "}
        {new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(note.updatedAt))}
      </div>
    </Card>
  );
}

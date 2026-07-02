import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Clock,
  Pencil,
  Check,
  ChevronUp,
  ChevronDown,
  FolderInput,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Note } from "@/types";
import { RichTextEditor } from "@/components/RichTextEditor";

type NotePatch = Partial<Pick<Note, "title" | "contentHtml" | "groupName">>;

interface NoteCardProps {
  note: Note;
  /** Ouvre la note directement en édition (ex. juste après création). */
  startEditing?: boolean;
  /** Noms de groupes existants (autocomplete). */
  groupNames: string[];
  /** true si la note peut monter dans son groupe (pas déjà en haut). */
  canMoveUp: boolean;
  /** true si la note peut descendre dans son groupe (pas déjà en bas). */
  canMoveDown: boolean;
  onUpdate: (id: string, patch: NotePatch) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

/**
 * Carte d'une note occupant toute la largeur.
 * Par défaut en **mode lecture** ; on bascule en édition via « Modifier »,
 * et « Terminé » repasse en lecture. En lecture, deux flèches ↑↓ permettent
 * de réordonner la note dans son groupe.
 */
export function NoteCard({
  note,
  startEditing = false,
  groupNames,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onDelete,
  onMove,
}: NoteCardProps) {
  const [editing, setEditing] = useState(startEditing);
  const [title, setTitle] = useState(note.title);
  const [groupName, setGroupName] = useState(note.groupName ?? "");
  // Dernier contenu HTML connu (mis à jour à chaque frappe, non débouncé).
  const contentRef = useRef(note.contentHtml);
  const timer = useRef<number | null>(null);

  // Débounce des écritures pour ne pas persister à chaque frappe
  // (utile surtout avec le backend réseau D1).
  const debouncedUpdate = (patch: NotePatch) => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onUpdate(note.id, patch), 400);
  };

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    []
  );

  const finishEditing = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    onUpdate(note.id, {
      title,
      groupName,
      contentHtml: contentRef.current,
    });
    setEditing(false);
  };

  // Datalist id unique par note pour éviter les collisions.
  const datalistId = `groups-${note.id}`;

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
          {/* Flèches de réordonnancement — visibles seulement en lecture,
              pour ne pas voler l'espace du bandeau d'édition. */}
          {!editing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canMoveUp}
                onClick={() => onMove(note.id, "up")}
                aria-label="Monter la note"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canMoveDown}
                onClick={() => onMove(note.id, "down")}
                aria-label="Descendre la note"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )}

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

      {/* Champ « Groupe » — visible seulement en édition. */}
      {editing && (
        <div className="mb-3 grid gap-1.5">
          <Label
            htmlFor={`group-${note.id}`}
            className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <FolderInput className="h-3.5 w-3.5" />
            Groupe
          </Label>
          <Input
            id={`group-${note.id}`}
            list={datalistId}
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              debouncedUpdate({ groupName: e.target.value });
            }}
            placeholder="Ex. Clients récurrents, Urgences… (vide = Sans groupe)"
          />
          <datalist id={datalistId}>
            {groupNames.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
      )}

      {/* Corps : éditeur en édition, contenu rendu en lecture */}
      {editing ? (
        <RichTextEditor
          key={note.id}
          initialHtml={note.contentHtml}
          onChange={(html) => {
            contentRef.current = html;
            debouncedUpdate({ contentHtml: html });
          }}
          placeholder="Contenu de la note… (activez gras / souligné / rouge puis tapez)"
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

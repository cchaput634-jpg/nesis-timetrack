import { useState } from "react";
import { Plus, StickyNote, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoteCard } from "./NoteCard";
import { useNotes, type NoteGroup } from "@/hooks/useNotes";
import { ACTIVITY_META, type NoteCategory } from "@/types";

interface NotesScreenProps {
  category: NoteCategory;
}

/** Préfixe des id de zones de dépôt de groupes (pour distinguer des ids de notes). */
const GROUP_DROP_PREFIX = "group:";

/**
 * Écran de notes d'une catégorie (SAV ou Démarchage).
 * Notes pleine largeur regroupées par « Groupe », réordonnables via
 * drag-and-drop (poignée à gauche) **et** flèches ↑↓ (fallback clavier
 * / accessibilité).
 */
export function NotesScreen({ category }: NotesScreenProps) {
  const {
    groups,
    groupNames,
    notes,
    addNote,
    updateNote,
    deleteNote,
    moveNote,
    reorderNotes,
  } = useNotes(category);
  const label = ACTIVITY_META[category].label;
  // Id de la note tout juste créée → ouverte directement en édition.
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Sensors adaptés : souris = drag instantané (>6px), tactile = long-press
  // (200 ms) pour laisser le scroll natif fonctionner sur mobile.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    })
  );

  const handleCreate = () => setNewlyCreatedId(addNote().id);

  /** Localise une note (groupe + index dans le groupe). */
  const findNote = (id: string) => {
    for (const g of groups) {
      const idx = g.notes.findIndex((n) => n.id === id);
      if (idx >= 0) return { group: g.name, index: idx };
    }
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const src = findNote(activeId);
    if (!src) return;

    // Dépose dans la zone d'un groupe (ex. groupe vide, dépôt en fin) :
    if (overId.startsWith(GROUP_DROP_PREFIX)) {
      const destGroup = overId.slice(GROUP_DROP_PREFIX.length);
      const destSize =
        groups.find((g) => g.name === destGroup)?.notes.filter((n) => n.id !== activeId)
          .length ?? 0;
      reorderNotes(activeId, destGroup, destSize);
      return;
    }

    // Dépose sur une autre note : insertion à sa position (arrayMove-like).
    const dest = findNote(overId);
    if (!dest) return;
    reorderNotes(activeId, dest.group, dest.index);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const activeNote = activeDragId
    ? notes.find((n) => n.id === activeDragId) ?? null
    : null;

  return (
    <div className="flex flex-col gap-6">
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          {groups.map((group) => (
            <GroupSection
              key={group.name || "__none__"}
              group={group}
              groupNames={groupNames}
              newlyCreatedId={newlyCreatedId}
              onUpdate={updateNote}
              onDelete={deleteNote}
              onMove={moveNote}
            />
          ))}

          {/* Aperçu flottant pendant le drag (au-dessus du curseur). */}
          <DragOverlay dropAnimation={null}>
            {activeNote && (
              <div className="pointer-events-none rounded-xl border bg-card px-4 py-3 shadow-lg">
                <span className="text-sm font-semibold">
                  {activeNote.title || "Note sans titre"}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

interface GroupSectionProps {
  group: NoteGroup;
  groupNames: string[];
  newlyCreatedId: string | null;
  onUpdate: React.ComponentProps<typeof NoteCard>["onUpdate"];
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

/**
 * Section d'un groupe : en-tête + SortableContext local + zone droppable
 * (pour accepter les dépôts même quand le groupe est vide de cartes en
 * cours de drag).
 */
function GroupSection({
  group,
  groupNames,
  newlyCreatedId,
  onUpdate,
  onDelete,
  onMove,
}: GroupSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${GROUP_DROP_PREFIX}${group.name}`,
  });
  const noteIds = group.notes.map((n) => n.id);

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 border-b pb-1.5">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {group.name || "Sans groupe"}
        </h2>
        <span className="text-xs text-muted-foreground">
          · {group.notes.length}
        </span>
      </header>

      <SortableContext
        items={noteIds}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={
            "flex flex-col gap-4 rounded-lg transition-colors " +
            (isOver ? "bg-accent/40" : "")
          }
        >
          <AnimatePresence initial={false}>
            {group.notes.map((note, idx) => (
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
                  groupNames={groupNames}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < group.notes.length - 1}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onMove={onMove}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </section>
  );
}

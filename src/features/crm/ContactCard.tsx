import { Phone, Mail, Calendar, Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/types";

interface ContactCardProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}

/** Formate une date ISO "YYYY-MM-DD" en français lisible. */
function formatDate(iso: string | null): string {
  if (!iso) return "Jamais contacté";
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Carte d'un contact avec ses coordonnées, sa date de dernier contact et ses notes. */
export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const fullName =
    `${contact.firstName} ${contact.lastName}`.trim() || "Contact sans nom";

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </span>
          <span className="truncate font-medium">{fullName}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
            aria-label="Modifier le contact"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label="Supprimer le contact"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex items-center gap-2 hover:text-foreground"
          >
            <Phone className="h-3.5 w-3.5" />
            {contact.phone}
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-2 truncate hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        <span className="inline-flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Dernier contact : {formatDate(contact.lastContactDate)}
        </span>
      </div>

      {contact.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-2.5 text-sm">
          {contact.notes}
        </p>
      )}
    </div>
  );
}

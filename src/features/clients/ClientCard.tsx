import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Clock,
  UserRound,
  Pencil,
  Check,
  Phone,
  Mail,
  Briefcase,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClientInfo } from "@/types";

type ClientPatch = Partial<
  Pick<
    ClientInfo,
    "firstName" | "lastName" | "role" | "phone" | "email" | "notes"
  >
>;

interface ClientCardProps {
  client: ClientInfo;
  /** Ouvre la fiche directement en édition (ex. juste après création). */
  startEditing?: boolean;
  onUpdate: (id: string, patch: ClientPatch) => void;
  onDelete: (id: string) => void;
}

/**
 * Carte d'un interlocuteur.
 * Par défaut en **mode lecture** (pas d'édition accidentelle) ; on bascule
 * en édition via « Modifier », « Terminé » repasse en lecture.
 */
export function ClientCard({
  client,
  startEditing = false,
  onUpdate,
  onDelete,
}: ClientCardProps) {
  const [editing, setEditing] = useState(startEditing);
  const [form, setForm] = useState({
    firstName: client.firstName,
    lastName: client.lastName,
    role: client.role,
    phone: client.phone,
    email: client.email,
    notes: client.notes,
  });
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    []
  );

  // Débounce des écritures (chaque touche) : évite un aller-retour D1
  // à chaque frappe. La sortie du mode édition force une persistance immédiate.
  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => onUpdate(client.id, { [key]: value }),
      400
    );
  };

  const finishEditing = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    onUpdate(client.id, form);
    setEditing(false);
  };

  const fullName =
    `${form.firstName} ${form.lastName}`.trim() || "Nouvel interlocuteur";

  return (
    <Card className="p-4 sm:p-6">
      {/* En-tête : avatar + nom + actions */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="h-5 w-5 text-muted-foreground" />
        </span>
        <h3 className="flex-1 truncate text-lg font-semibold">{fullName}</h3>

        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <Button size="sm" onClick={finishEditing}>
              <Check className="h-4 w-4" />
              Terminé
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(client.id)}
            aria-label="Supprimer l'interlocuteur"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Corps : formulaire en édition, vue synthétique en lecture. */}
      {editing ? <EditView form={form} clientId={client.id} onSet={set} /> : (
        <ReadView form={form} />
      )}

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Modifiée le{" "}
        {new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(client.updatedAt))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Vue lecture                                                         */
/* ------------------------------------------------------------------ */

function ReadView({ form }: { form: ClientPatch }) {
  const hasAny =
    !!form.role || !!form.phone || !!form.email || !!(form.notes ?? "").trim();
  if (!hasAny) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Fiche vide — cliquez sur « Modifier » pour remplir ses coordonnées.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      {form.role && (
        <span className="inline-flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="text-foreground">{form.role}</span>
        </span>
      )}
      {form.phone && (
        <a
          href={`tel:${form.phone}`}
          className="inline-flex items-center gap-2 hover:text-foreground"
        >
          <Phone className="h-3.5 w-3.5" />
          {form.phone}
        </a>
      )}
      {form.email && (
        <a
          href={`mailto:${form.email}`}
          className="inline-flex items-center gap-2 truncate hover:text-foreground"
        >
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{form.email}</span>
        </a>
      )}
      {form.notes && (
        <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-2.5 text-sm text-foreground">
          {form.notes}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue édition (formulaire)                                            */
/* ------------------------------------------------------------------ */

function EditView({
  form,
  clientId,
  onSet,
}: {
  form: {
    firstName: string;
    lastName: string;
    role: string;
    phone: string;
    email: string;
    notes: string;
  };
  clientId: string;
  onSet: (key: keyof typeof form, value: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id={`first-${clientId}`}
          label="Prénom"
          value={form.firstName}
          onChange={(v) => onSet("firstName", v)}
          placeholder="Camille"
        />
        <Field
          id={`last-${clientId}`}
          label="Nom"
          value={form.lastName}
          onChange={(v) => onSet("lastName", v)}
          placeholder="Deveraux"
        />
        <Field
          id={`role-${clientId}`}
          label="Poste"
          value={form.role}
          onChange={(v) => onSet("role", v)}
          placeholder="Responsable achats"
        />
        <Field
          id={`phone-${clientId}`}
          label="Téléphone"
          type="tel"
          value={form.phone}
          onChange={(v) => onSet("phone", v)}
          placeholder="06 12 34 56 78"
        />
        <Field
          id={`email-${clientId}`}
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => onSet("email", v)}
          placeholder="camille@exemple.fr"
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-4 grid gap-2">
        <Label htmlFor={`notes-${clientId}`}>Notes</Label>
        <Textarea
          id={`notes-${clientId}`}
          value={form.notes}
          onChange={(e) => onSet("notes", e.target.value)}
          placeholder="Contexte, échanges, préférences…"
          className="min-h-[100px]"
        />
      </div>
    </>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Trash2, Clock, UserRound } from "lucide-react";
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
  onUpdate: (id: string, patch: ClientPatch) => void;
  onDelete: (id: string) => void;
}

/** Carte remplissable d'une fiche client, sauvegarde automatique (débounce). */
export function ClientCard({ client, onUpdate, onDelete }: ClientCardProps) {
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

  // Met à jour l'état local immédiatement + persiste en différé (400 ms).
  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => onUpdate(client.id, { [key]: value }),
      400
    );
  };

  const title =
    `${form.firstName} ${form.lastName}`.trim() || "Nouveau client";

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="h-5 w-5 text-muted-foreground" />
        </span>
        <h3 className="flex-1 truncate text-lg font-semibold">{title}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(client.id)}
          aria-label="Supprimer la fiche client"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id={`first-${client.id}`}
          label="Prénom"
          value={form.firstName}
          onChange={(v) => set("firstName", v)}
          placeholder="Camille"
        />
        <Field
          id={`last-${client.id}`}
          label="Nom"
          value={form.lastName}
          onChange={(v) => set("lastName", v)}
          placeholder="Deveraux"
        />
        <Field
          id={`role-${client.id}`}
          label="Poste"
          value={form.role}
          onChange={(v) => set("role", v)}
          placeholder="Responsable achats"
        />
        <Field
          id={`phone-${client.id}`}
          label="Téléphone"
          type="tel"
          value={form.phone}
          onChange={(v) => set("phone", v)}
          placeholder="06 12 34 56 78"
        />
        <Field
          id={`email-${client.id}`}
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
          placeholder="camille@exemple.fr"
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-4 grid gap-2">
        <Label htmlFor={`notes-${client.id}`}>Notes</Label>
        <Textarea
          id={`notes-${client.id}`}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Contexte, échanges, préférences…"
          className="min-h-[100px]"
        />
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
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

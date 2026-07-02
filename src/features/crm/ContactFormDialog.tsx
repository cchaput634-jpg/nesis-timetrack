import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Contact } from "@/types";

type ContactValues = Omit<Contact, "id">;

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contact à éditer, ou undefined pour une création. */
  contact?: Contact;
  onSubmit: (values: ContactValues) => void;
}

const EMPTY: ContactValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  lastContactDate: null,
  notes: "",
};

/** Dialog de création / édition d'un contact rattaché à une entreprise. */
export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
}: ContactFormDialogProps) {
  const [values, setValues] = useState<ContactValues>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setValues(contact ? { ...contact } : EMPTY);
  }, [open, contact]);

  const set = <K extends keyof ContactValues>(key: K, value: ContactValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.lastName.trim() && !values.firstName.trim()) return;
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {contact ? "Modifier le contact" : "Nouveau contact"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="contact-first">Prénom</Label>
              <Input
                id="contact-first"
                value={values.firstName}
                autoFocus
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-last">Nom</Label>
              <Input
                id="contact-last"
                value={values.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Téléphone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-date">Date de dernier contact</Label>
            <Input
              id="contact-date"
              type="date"
              value={values.lastContactDate ?? ""}
              onChange={(e) =>
                set("lastContactDate", e.target.value || null)
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-notes">Notes / historique</Label>
            <Textarea
              id="contact-notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit">
              {contact ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

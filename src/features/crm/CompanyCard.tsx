import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContactCard } from "./ContactCard";
import { ContactFormDialog } from "./ContactFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  LEAD_STATUS_META,
  type Company,
  type Contact,
} from "@/types";

interface CompanyCardProps {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
  onAddContact: (values: Omit<Contact, "id">) => void;
  onUpdateContact: (contactId: string, values: Omit<Contact, "id">) => void;
  onDeleteContact: (contactId: string) => void;
}

/** Carte entreprise dépliable : infos globales + gestion multi-contacts. */
export function CompanyCard({
  company,
  onEdit,
  onDelete,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
}: CompanyCardProps) {
  const [open, setOpen] = useState(false);
  const [contactDialog, setContactDialog] = useState<{
    open: boolean;
    contact?: Contact;
  }>({ open: false });
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const statusMeta = LEAD_STATUS_META[company.status];

  return (
    <Card className="overflow-hidden">
      {/* En-tête cliquable */}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{company.name}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  statusMeta.badgeClass
                )}
              >
                {statusMeta.label}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {company.sector && <span>{company.sector}</span>}
              {company.sector && <span>·</span>}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {company.contacts.length}
              </span>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
            aria-label="Modifier l'entreprise"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label="Supprimer l'entreprise"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Réduire" : "Déplier"}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t p-4 sm:p-5">
              {company.notes && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes générales
                  </div>
                  <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                    {company.notes}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Contacts ({company.contacts.length})
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setContactDialog({ open: true })}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {company.contacts.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Aucun contact pour le moment.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {company.contacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onEdit={() =>
                          setContactDialog({ open: true, contact })
                        }
                        onDelete={() => setContactToDelete(contact)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs de contact (création / édition / suppression) */}
      <ContactFormDialog
        open={contactDialog.open}
        onOpenChange={(o) =>
          setContactDialog((prev) => ({ ...prev, open: o }))
        }
        contact={contactDialog.contact}
        onSubmit={(values) => {
          if (contactDialog.contact) {
            onUpdateContact(contactDialog.contact.id, values);
          } else {
            onAddContact(values);
          }
        }}
      />

      <ConfirmDialog
        open={contactToDelete !== null}
        onOpenChange={(o) => !o && setContactToDelete(null)}
        title="Supprimer ce contact ?"
        description={
          contactToDelete
            ? `${contactToDelete.firstName} ${contactToDelete.lastName}`.trim()
            : undefined
        }
        onConfirm={() =>
          contactToDelete && onDeleteContact(contactToDelete.id)
        }
      />
    </Card>
  );
}

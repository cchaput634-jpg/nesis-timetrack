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
import { cn } from "@/lib/utils";
import { LEAD_STATUS_META, type Company, type LeadStatus } from "@/types";

type CompanyValues = Pick<Company, "name" | "sector" | "status" | "notes">;

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entreprise à éditer, ou undefined pour une création. */
  company?: Company;
  onSubmit: (values: CompanyValues) => void;
}

const EMPTY: CompanyValues = {
  name: "",
  sector: "",
  status: "nouveau",
  notes: "",
};

/** Dialog de création / édition d'une entreprise. */
export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  onSubmit,
}: CompanyFormDialogProps) {
  const [values, setValues] = useState<CompanyValues>(EMPTY);

  // Réhydrate le formulaire à chaque ouverture selon le contexte.
  useEffect(() => {
    if (!open) return;
    setValues(
      company
        ? {
            name: company.name,
            sector: company.sector,
            status: company.status,
            notes: company.notes,
          }
        : EMPTY
    );
  }, [open, company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {company ? "Modifier l'entreprise" : "Nouvelle entreprise"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company-name">Nom de l'entreprise *</Label>
            <Input
              id="company-name"
              value={values.name}
              autoFocus
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
              placeholder="Ex. Atelier Novaris"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company-sector">Secteur</Label>
            <Input
              id="company-sector"
              value={values.sector}
              onChange={(e) =>
                setValues((v) => ({ ...v, sector: e.target.value }))
              }
              placeholder="Ex. Restauration, BTP, e-commerce…"
            />
          </div>

          <div className="grid gap-2">
            <Label>Statut du lead</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LEAD_STATUS_META) as LeadStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, status: s }))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    values.status === s
                      ? LEAD_STATUS_META[s].badgeClass
                      : "border-input bg-background text-muted-foreground hover:bg-accent"
                  )}
                >
                  {LEAD_STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company-notes">Notes générales</Label>
            <Textarea
              id="company-notes"
              value={values.notes}
              onChange={(e) =>
                setValues((v) => ({ ...v, notes: e.target.value }))
              }
              placeholder="Contexte, besoins identifiés, historique global…"
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
              {company ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

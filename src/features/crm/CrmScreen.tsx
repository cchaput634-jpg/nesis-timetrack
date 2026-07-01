import { useMemo, useState } from "react";
import { Plus, Search, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyCard } from "./CompanyCard";
import { CompanyFormDialog } from "./CompanyFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useCompanies } from "@/hooks/useCompanies";
import type { Company } from "@/types";

/** Écran 2 : CRM de démarchage (entreprises + contacts, CRUD complet). */
export function CrmScreen() {
  const {
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    addContact,
    updateContact,
    deleteContact,
  } = useCompanies();

  const [query, setQuery] = useState("");
  const [companyDialog, setCompanyDialog] = useState<{
    open: boolean;
    company?: Company;
  }>({ open: false });
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // Filtre par nom d'entreprise, secteur ou nom de contact.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const haystack = [
        c.name,
        c.sector,
        ...c.contacts.map((ct) => `${ct.firstName} ${ct.lastName}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une entreprise ou un contact…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCompanyDialog({ open: true })}>
          <Plus className="h-4 w-4" />
          Nouvelle entreprise
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              Aucune entreprise. Ajoutez votre premier prospect pour démarrer
              votre suivi de démarchage.
            </p>
            <Button onClick={() => setCompanyDialog({ open: true })}>
              <Plus className="h-4 w-4" />
              Nouvelle entreprise
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun résultat pour « {query} ».
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={() => setCompanyDialog({ open: true, company })}
              onDelete={() => setCompanyToDelete(company)}
              onAddContact={(values) => addContact(company.id, values)}
              onUpdateContact={(contactId, values) =>
                updateContact(company.id, contactId, values)
              }
              onDeleteContact={(contactId) =>
                deleteContact(company.id, contactId)
              }
            />
          ))}
        </div>
      )}

      {/* Création / édition d'entreprise */}
      <CompanyFormDialog
        open={companyDialog.open}
        onOpenChange={(o) => setCompanyDialog((prev) => ({ ...prev, open: o }))}
        company={companyDialog.company}
        onSubmit={(values) => {
          if (companyDialog.company) {
            updateCompany(companyDialog.company.id, values);
          } else {
            addCompany(values);
          }
        }}
      />

      {/* Suppression d'entreprise */}
      <ConfirmDialog
        open={companyToDelete !== null}
        onOpenChange={(o) => !o && setCompanyToDelete(null)}
        title="Supprimer cette entreprise ?"
        description={
          companyToDelete
            ? `« ${companyToDelete.name} » et ses ${companyToDelete.contacts.length} contact(s) seront définitivement supprimés.`
            : undefined
        }
        onConfirm={() => companyToDelete && deleteCompany(companyToDelete.id)}
      />
    </div>
  );
}

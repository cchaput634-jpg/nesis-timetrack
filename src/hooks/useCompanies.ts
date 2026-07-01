import { useCallback, useEffect, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import type { Company, Contact } from "@/types";

type CompanyDraft = Omit<Company, "id" | "contacts" | "createdAt">;
type ContactDraft = Omit<Contact, "id">;

/**
 * Gère le CRM de démarchage : entreprises et leurs contacts.
 * CRUD complet, persistance automatique via la couche `db`.
 */
export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getCompanies().then((data) => {
      setCompanies(data);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: Company[]) => {
    setCompanies(next);
    void db.saveCompanies(next);
  }, []);

  /* ---- Entreprises ---- */

  const addCompany = useCallback(
    (draft: CompanyDraft): Company => {
      const company: Company = {
        ...draft,
        id: uid(),
        contacts: [],
        createdAt: Date.now(),
      };
      persist([company, ...companies]);
      return company;
    },
    [companies, persist]
  );

  const updateCompany = useCallback(
    (id: string, patch: Partial<CompanyDraft>) =>
      persist(
        companies.map((c) => (c.id === id ? { ...c, ...patch } : c))
      ),
    [companies, persist]
  );

  const deleteCompany = useCallback(
    (id: string) => persist(companies.filter((c) => c.id !== id)),
    [companies, persist]
  );

  /* ---- Contacts (imbriqués dans une entreprise) ---- */

  const addContact = useCallback(
    (companyId: string, draft: ContactDraft) =>
      persist(
        companies.map((c) =>
          c.id === companyId
            ? { ...c, contacts: [...c.contacts, { ...draft, id: uid() }] }
            : c
        )
      ),
    [companies, persist]
  );

  const updateContact = useCallback(
    (companyId: string, contactId: string, patch: Partial<ContactDraft>) =>
      persist(
        companies.map((c) =>
          c.id === companyId
            ? {
                ...c,
                contacts: c.contacts.map((ct) =>
                  ct.id === contactId ? { ...ct, ...patch } : ct
                ),
              }
            : c
        )
      ),
    [companies, persist]
  );

  const deleteContact = useCallback(
    (companyId: string, contactId: string) =>
      persist(
        companies.map((c) =>
          c.id === companyId
            ? { ...c, contacts: c.contacts.filter((ct) => ct.id !== contactId) }
            : c
        )
      ),
    [companies, persist]
  );

  return {
    companies,
    loading,
    addCompany,
    updateCompany,
    deleteCompany,
    addContact,
    updateContact,
    deleteContact,
  };
}

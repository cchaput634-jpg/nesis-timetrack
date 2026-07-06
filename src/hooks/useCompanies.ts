import { useCallback, useEffect, useState } from "react";
import { db } from "@/services/storage";
import { uid } from "@/lib/time";
import { useProfileContext } from "@/context/ProfileContext";
import type { Company, Contact } from "@/types";

type CompanyDraft = Omit<Company, "id" | "contacts" | "createdAt">;
type ContactDraft = Omit<Contact, "id">;

/**
 * Gère le CRM de démarchage du profil actif : entreprises et contacts.
 * Recharge quand le profil change.
 */
export function useCompanies() {
  const { activeProfileId } = useProfileContext();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    db.getCompanies(activeProfileId).then((data) => {
      setCompanies(data);
      setLoading(false);
    });
  }, [activeProfileId]);

  const persist = useCallback(
    (next: Company[]) => {
      setCompanies(next);
      if (activeProfileId) void db.saveCompanies(activeProfileId, next);
    },
    [activeProfileId]
  );

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

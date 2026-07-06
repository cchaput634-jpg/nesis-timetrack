import { useState } from "react";
import { ChevronDown, Check, Plus, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProfileContext } from "@/context/ProfileContext";
import { ManageProfilesDialog } from "./ManageProfilesDialog";

/**
 * Sélecteur de profil client, placé en haut de la sidebar.
 * Ouvre un menu déroulant listant les profils + accès à la gestion.
 */
export function ProfileSwitcher() {
  const {
    profiles,
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    addProfile,
  } = useProfileContext();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const handleAdd = () => {
    const p = addProfile("Nouveau client");
    setActiveProfileId(p.id);
    setOpen(false);
    setManageOpen(true);
  };

  return (
    <div className="border-b p-3">
      <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Profil client
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-left text-sm font-medium hover:bg-accent"
        >
          {activeProfile && (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: activeProfile.color }}
            />
          )}
          <span className="flex-1 truncate">
            {activeProfile?.name ?? "…"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <>
              {/* Barrière click-outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-background shadow-lg"
              >
                <ul className="max-h-64 overflow-y-auto py-1">
                  {profiles.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProfileId(p.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-accent",
                          p.id === activeProfileId && "bg-accent/60"
                        )}
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="flex-1 truncate">{p.name}</span>
                        {p.id === activeProfileId && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1 border-t p-1">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Nouveau client
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManageOpen(true);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Gérer les profils"
                  >
                    <Settings2 className="h-4 w-4" />
                    Gérer
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <ManageProfilesDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}

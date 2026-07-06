import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Contact2,
  Menu,
  X,
  NotebookPen,
  UserRound,
  Plus,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimerScreen } from "@/features/timer/TimerScreen";
import { CrmScreen } from "@/features/crm/CrmScreen";
import { NotesScreen } from "@/features/notes/NotesScreen";
import { ClientInfoScreen } from "@/features/clients/ClientInfoScreen";
import { ProfileSwitcher } from "@/features/profiles/ProfileSwitcher";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useNotebooks } from "@/hooks/useNotebooks";
import type { Notebook } from "@/types";

/** Vue active de l'app. Une chaîne préfixée `notebook:<id>` désigne un
 *  cahier dynamique ; les vues statiques ont un id littéral. */
type StaticView = "timer" | "crm" | "clients";
type View = StaticView | `notebook:${string}`;

interface NavStatic {
  id: StaticView;
  label: string;
  icon: React.ReactNode;
}

const STATIC_NAV: NavStatic[] = [
  { id: "timer", label: "Timer & Stats", icon: <Timer className="h-5 w-5" /> },
  { id: "crm", label: "Suivi Démarchage", icon: <Contact2 className="h-5 w-5" /> },
  { id: "clients", label: "Info client", icon: <UserRound className="h-5 w-5" /> },
];

export default function App() {
  const [view, setView] = useState<View>("timer");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { notebooks, addNotebook, updateNotebook, deleteNotebook } =
    useNotebooks();

  /** Cahier actif si la vue courante en désigne un. */
  const activeNotebook = useMemo(() => {
    if (!view.startsWith("notebook:")) return null;
    const id = view.slice("notebook:".length);
    return notebooks.find((n) => n.id === id) ?? null;
  }, [view, notebooks]);

  /** Label de l'en-tête (page courante). */
  const activeLabel = useMemo(() => {
    if (activeNotebook) return activeNotebook.name;
    return STATIC_NAV.find((n) => n.id === view)?.label ?? "";
  }, [view, activeNotebook]);

  const openNotebook = (id: string) => setView(`notebook:${id}`);

  const handleAddNotebook = () => {
    const nb = addNotebook("Nouveau cahier");
    openNotebook(nb.id);
  };

  const handleDeleteNotebook = (id: string) => {
    deleteNotebook(id);
    // Retombe sur la première vue statique si on supprimait celle affichée.
    if (view === `notebook:${id}`) setView("timer");
  };

  /** Rendu de l'écran principal selon la vue active. */
  const rendered = (() => {
    if (activeNotebook) {
      return (
        <NotesScreen
          notebookId={activeNotebook.id}
          notebookName={activeNotebook.name}
        />
      );
    }
    switch (view) {
      case "timer":
        return <TimerScreen />;
      case "crm":
        return <CrmScreen />;
      case "clients":
        return <ClientInfoScreen />;
      default:
        return <TimerScreen />;
    }
  })();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar — fixe sur desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <Brand />
        <ProfileSwitcher />
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {STATIC_NAV.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={view === item.id}
              onClick={() => setView(item.id)}
            />
          ))}

          <NotebooksNav
            notebooks={notebooks}
            activeView={view}
            onOpen={openNotebook}
            onAdd={handleAddNotebook}
            onRename={updateNotebook}
            onDelete={handleDeleteNotebook}
          />
        </nav>
        <p className="p-4 text-xs text-muted-foreground">
          Synchronisé avec la base Cloudflare D1 · cache local hors-ligne.
        </p>
      </aside>

      {/* Sidebar mobile — tiroir rétractable */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ProfileSwitcher />
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {STATIC_NAV.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={view === item.id}
                    onClick={() => {
                      setView(item.id);
                      setMobileOpen(false);
                    }}
                  />
                ))}
                <NotebooksNav
                  notebooks={notebooks}
                  activeView={view}
                  onOpen={(id) => {
                    openNotebook(id);
                    setMobileOpen(false);
                  }}
                  onAdd={() => {
                    handleAddNotebook();
                    setMobileOpen(false);
                  }}
                  onRename={updateNotebook}
                  onDelete={handleDeleteNotebook}
                />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img
            src="/nesis-logo.png"
            alt="Logo Nesis"
            className="h-7 w-7 object-contain"
          />
          <span className="font-semibold">{activeLabel}</span>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight">
              {activeLabel}
            </h1>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {rendered}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/** Logo Nesis + titre. */
function Brand() {
  return (
    <div className="flex items-center gap-2.5 border-b p-4">
      <img
        src="/nesis-logo.png"
        alt="Logo Nesis"
        className="h-10 w-10 shrink-0 object-contain"
      />
      <span className="text-2xl font-bold tracking-tight">Nesis</span>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Section « Cahiers » dans la sidebar                                 */
/* ------------------------------------------------------------------ */

interface NotebooksNavProps {
  notebooks: Notebook[];
  activeView: View;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, patch: { name: string }) => void;
  onDelete: (id: string) => void;
}

function NotebooksNav({
  notebooks,
  activeView,
  onOpen,
  onAdd,
  onRename,
  onDelete,
}: NotebooksNavProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Notebook | null>(null);

  return (
    <>
      <div className="mt-3 flex items-center justify-between px-2 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Cahiers de notes</span>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent hover:text-foreground"
          aria-label="Ajouter un cahier"
          title="Ajouter un cahier"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {notebooks.map((nb) => {
        const isActive = activeView === `notebook:${nb.id}`;
        const isRenaming = renamingId === nb.id;
        return (
          <div key={nb.id} className="group relative flex items-center">
            {isRenaming ? (
              <RenameField
                initial={nb.name}
                onCancel={() => setRenamingId(null)}
                onCommit={(name) => {
                  onRename(nb.id, { name });
                  setRenamingId(null);
                }}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpen(nb.id)}
                  className={cn(
                    "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <NotebookPen className="h-5 w-5 shrink-0" />
                  <span className="truncate">{nb.name}</span>
                </button>
                <div className="absolute right-1 hidden gap-0.5 group-hover:flex group-focus-within:flex">
                  <button
                    type="button"
                    onClick={() => setRenamingId(nb.id)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded",
                      isActive
                        ? "text-primary-foreground/80 hover:bg-white/10"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    aria-label={`Renommer ${nb.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(nb)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded",
                      isActive
                        ? "text-primary-foreground/80 hover:bg-white/10"
                        : "text-muted-foreground hover:bg-accent hover:text-destructive"
                    )}
                    aria-label={`Supprimer ${nb.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={
          pendingDelete ? `Supprimer le cahier « ${pendingDelete.name} » ?` : ""
        }
        description="Le cahier sera supprimé, mais les notes rattachées resteront dans la base — pour les récupérer, recréez un cahier avec le même nom / id."
        onConfirm={() => pendingDelete && onDelete(pendingDelete.id)}
      />
    </>
  );
}

/** Champ inline pour renommer un cahier. Entrée = valider, Échap = annuler. */
function RenameField({
  initial,
  onCancel,
  onCommit,
}: {
  initial: string;
  onCancel: () => void;
  onCommit: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex flex-1 items-center gap-1 rounded-lg border bg-background px-2 py-1">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const trimmed = value.trim();
            if (trimmed) onCommit(trimmed);
            else onCancel();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        className="h-7 border-0 px-1 text-sm shadow-none focus-visible:ring-0"
      />
      <button
        type="button"
        onClick={() => {
          const trimmed = value.trim();
          if (trimmed) onCommit(trimmed);
          else onCancel();
        }}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Valider"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}

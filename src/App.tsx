import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Contact2,
  Menu,
  X,
  NotebookPen,
  NotebookText,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TimerScreen } from "@/features/timer/TimerScreen";
import { CrmScreen } from "@/features/crm/CrmScreen";
import { NotesScreen } from "@/features/notes/NotesScreen";
import { ClientInfoScreen } from "@/features/clients/ClientInfoScreen";
import { ProfileSwitcher } from "@/features/profiles/ProfileSwitcher";

type View = "timer" | "crm" | "clients" | "note-sav" | "note-demarchage";

const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "timer",
    label: "Timer & Stats",
    icon: <Timer className="h-5 w-5" />,
  },
  {
    id: "crm",
    label: "Suivi Démarchage",
    icon: <Contact2 className="h-5 w-5" />,
  },
  {
    id: "clients",
    label: "Info client",
    icon: <UserRound className="h-5 w-5" />,
  },
  {
    id: "note-sav",
    label: "SAV note",
    icon: <NotebookPen className="h-5 w-5" />,
  },
  {
    id: "note-demarchage",
    label: "Démarchage note",
    icon: <NotebookText className="h-5 w-5" />,
  },
];

/** Sélection de l'écran à afficher selon l'onglet actif. */
function renderView(view: View) {
  switch (view) {
    case "timer":
      return <TimerScreen />;
    case "crm":
      return <CrmScreen />;
    case "clients":
      return <ClientInfoScreen />;
    case "note-sav":
      return <NotesScreen category="sav" />;
    case "note-demarchage":
      return <NotesScreen category="demarchage" />;
  }
}

export default function App() {
  const [view, setView] = useState<View>("timer");
  const [mobileOpen, setMobileOpen] = useState(false);

  const active = NAV.find((n) => n.id === view)!;

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar — fixe sur desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <Brand />
        <ProfileSwitcher />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={view === item.id}
              onClick={() => setView(item.id)}
            />
          ))}
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
              <nav className="flex flex-1 flex-col gap-1 p-3">
                {NAV.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={view === item.id}
                    onClick={() => {
                      setView(item.id);
                      setMobileOpen(false);
                    }}
                  />
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile */}
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
          <span className="font-semibold">{active.label}</span>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight">
              {active.label}
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
              {renderView(view)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/** Logo Nesis + titre de l'application. */
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
  item,
  active,
  onClick,
}: {
  item: (typeof NAV)[number];
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
      {item.icon}
      <span>{item.label}</span>
    </button>
  );
}

import { Plus, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientCard } from "./ClientCard";
import { useClients } from "@/hooks/useClients";

/** Onglet « Info client » : fiches clients remplissables (pleine largeur). */
export function ClientInfoScreen() {
  const { clients, addClient, updateClient, deleteClient } = useClients();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {clients.length} interlocuteur{clients.length > 1 ? "s" : ""}
        </p>
        <Button onClick={addClient}>
          <Plus className="h-4 w-4" />
          Nouvel interlocuteur
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <UserRound className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              Aucun interlocuteur. Ajoutez-en un pour renseigner ses
              coordonnées et vos notes.
            </p>
            <Button onClick={addClient}>
              <Plus className="h-4 w-4" />
              Nouvel interlocuteur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {clients.map((client) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <ClientCard
                  client={client}
                  onUpdate={updateClient}
                  onDelete={deleteClient}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

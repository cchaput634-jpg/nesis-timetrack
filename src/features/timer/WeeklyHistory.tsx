import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trash2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCompact, formatDuration, formatSessionDate } from "@/lib/time";
import type { Activity, Session, WeekGroup } from "@/types";

/** Représentation d'affichage pour une activité inconnue (ex. supprimée). */
const UNKNOWN_META = { label: "(activité supprimée)", color: "hsl(0 0% 60%)" };

interface WeeklyHistoryProps {
  weeks: WeekGroup[];
  /** Map id -> Activity pour retrouver libellés et couleurs à l'affichage. */
  activitiesById: Map<string, Activity>;
  onDelete: (id: string) => void;
}

/** Historique des sessions, regroupé par semaine ISO. Affichage dynamique
 *  selon les activités présentes dans les sessions de la semaine. */
export function WeeklyHistory({
  weeks,
  activitiesById,
  onDelete,
}: WeeklyHistoryProps) {
  if (weeks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
          <Clock className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            Aucune session enregistrée. Lancez le chrono pour commencer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {weeks.map((week) => (
        <WeekAccordion
          key={week.weekKey}
          week={week}
          activitiesById={activitiesById}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

/** Lookup libellé + couleur d'une activité par id (fallback : « supprimée »). */
function metaFor(activitiesById: Map<string, Activity>, id: string) {
  return activitiesById.get(id) ?? UNKNOWN_META;
}

function WeekAccordion({
  week,
  activitiesById,
  onDelete,
}: {
  week: WeekGroup;
  activitiesById: Map<string, Activity>;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  // Entrées de la semaine ordonnées par temps décroissant, prêtes à afficher.
  const entries = Object.entries(week.perActivitySec)
    .map(([id, sec]) => {
      const meta = metaFor(activitiesById, id);
      return {
        id,
        label: meta.label,
        color: meta.color,
        sec,
        pct: week.totalSec ? (sec / week.totalSec) * 100 : 0,
      };
    })
    .sort((a, b) => b.sec - a.sec);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{week.label}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {week.rangeLabel}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {week.sessions.length} session
            {week.sessions.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="tabular-nums text-lg font-bold">
              {formatCompact(week.totalSec)}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Total
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Répartition dynamique par activité (barre proportionnelle). */}
      <div className="px-4 pb-4 sm:px-5">
        <div className="flex overflow-hidden rounded-full">
          {entries.map((e) => (
            <div
              key={e.id}
              className="h-2"
              style={{ width: `${e.pct}%`, backgroundColor: e.color }}
              title={`${e.label} · ${formatCompact(e.sec)}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {entries.map((e) => (
            <SplitLabel
              key={e.id}
              color={e.color}
              label={e.label}
              value={formatCompact(e.sec)}
            />
          ))}
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
            <div className="border-t px-2 py-1 sm:px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activité</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {week.sessions.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      activitiesById={activitiesById}
                      onDelete={onDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function SessionRow({
  session,
  activitiesById,
  onDelete,
}: {
  session: Session;
  activitiesById: Map<string, Activity>;
  onDelete: (id: string) => void;
}) {
  const meta = metaFor(activitiesById, session.activity);
  return (
    <TableRow>
      <TableCell>
        <span className="inline-flex items-center gap-2 font-medium">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          {meta.label}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatSessionDate(session.startedAt)}
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">
        {formatDuration(session.durationSec)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(session.id)}
          aria-label="Supprimer la session"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function SplitLabel({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-medium text-foreground">{value}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

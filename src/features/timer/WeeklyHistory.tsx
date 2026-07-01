import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Trash2,
  Clock,
  Headphones,
  Megaphone,
} from "lucide-react";
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
import { ACTIVITY_META, type Session, type WeekGroup } from "@/types";

interface WeeklyHistoryProps {
  weeks: WeekGroup[];
  onDelete: (id: string) => void;
}

/** Historique des sessions, obligatoirement regroupé par semaine. */
export function WeeklyHistory({ weeks, onDelete }: WeeklyHistoryProps) {
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
        <WeekAccordion key={week.weekKey} week={week} onDelete={onDelete} />
      ))}
    </div>
  );
}

function WeekAccordion({
  week,
  onDelete,
}: {
  week: WeekGroup;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const savPct = week.totalSec ? (week.savSec / week.totalSec) * 100 : 0;

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

      {/* Répartition SAV vs Démarchage. */}
      <div className="px-4 pb-4 sm:px-5">
        <div className="flex overflow-hidden rounded-full">
          <div
            className="h-2"
            style={{
              width: `${savPct}%`,
              backgroundColor: ACTIVITY_META.sav.color,
            }}
          />
          <div
            className="h-2 flex-1"
            style={{ backgroundColor: ACTIVITY_META.demarchage.color }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <SplitLabel
            icon={<Headphones className="h-3.5 w-3.5" />}
            color={ACTIVITY_META.sav.color}
            label="SAV"
            value={formatCompact(week.savSec)}
          />
          <SplitLabel
            icon={<Megaphone className="h-3.5 w-3.5" />}
            color={ACTIVITY_META.demarchage.color}
            label="Démarchage"
            value={formatCompact(week.demarchageSec)}
          />
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
                    <SessionRow key={s.id} session={s} onDelete={onDelete} />
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
  onDelete,
}: {
  session: Session;
  onDelete: (id: string) => void;
}) {
  const meta = ACTIVITY_META[session.activity];
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
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span style={{ color }}>{icon}</span>
      <span className="font-medium text-foreground">{value}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

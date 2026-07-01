import { useCallback, useEffect, useRef, useState } from "react";
import { Bold, Underline, Baseline } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rouge appliqué au texte (rouge-600). */
const RED = "#dc2626";
const RED_RGB = "rgb(220,38,38)";

interface RichTextEditorProps {
  /** HTML initial (non contrôlé : n'est lu qu'au montage). */
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Éditeur de texte riche minimaliste basé sur `contentEditable`.
 * Formats : gras, souligné et rouge. Volontairement sans dépendance externe.
 *
 * Non contrôlé : le HTML initial est injecté une seule fois au montage.
 * Le parent doit fournir une `key` stable (ex. l'id de la note) pour forcer
 * un remontage lorsqu'on change de note — cela évite tout saut de curseur.
 */
export function RichTextEditor({
  initialHtml,
  onChange,
  placeholder = "Écrivez ici…",
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Couleur de texte par défaut (pour désactiver le rouge).
  const defaultColor = useRef<string>("");
  const [active, setActive] = useState({
    bold: false,
    underline: false,
    red: false,
  });

  // Injecte le contenu initial UNE SEULE FOIS (au montage) et mémorise la
  // couleur par défaut. On ne réinjecte jamais `initialHtml` ensuite : sinon
  // chaque sauvegarde replacerait le curseur au début de la note. Pour éditer
  // une autre note, le parent remonte l'éditeur via `key={note.id}`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = initialHtml;
    defaultColor.current = getComputedStyle(ref.current).color;
  }, []);

  // Reflète l'état des commandes au niveau de la sélection.
  const refreshActive = useCallback(() => {
    const fore = document.queryCommandValue("foreColor").replace(/\s/g, "");
    setActive({
      bold: document.queryCommandState("bold"),
      underline: document.queryCommandState("underline"),
      red: fore === RED_RGB,
    });
  }, []);

  // Garde les indicateurs (gras/souligné/rouge) synchronisés avec le format
  // à la position du curseur — y compris au déplacement du caret sur mobile.
  useEffect(() => {
    const handler = () => {
      const sel = document.getSelection();
      if (sel && ref.current && ref.current.contains(sel.anchorNode)) {
        refreshActive();
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [refreshActive]);

  const emit = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const toggle = useCallback(
    (command: "bold" | "underline") => {
      // Focus d'abord : garantit que la commande cible bien l'éditeur.
      // Sans sélection, execCommand active le format pour le texte À VENIR
      // (on active le gras/souligné, puis on tape → le texte sort formaté).
      ref.current?.focus();
      document.execCommand(command);
      refreshActive();
      emit();
    },
    [refreshActive, emit]
  );

  const toggleRed = useCallback(() => {
    ref.current?.focus();
    // styleWithCSS -> produit <span style="color:…"> plutôt que <font>.
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(
      "foreColor",
      false,
      active.red ? defaultColor.current || "#000000" : RED
    );
    refreshActive();
    emit();
  }, [active.red, refreshActive, emit]);

  return (
    <div className="rounded-lg border bg-background">
      {/* Barre d'outils */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <ToolbarButton
          label="Gras"
          active={active.bold}
          onClick={() => toggle("bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Souligné"
          active={active.underline}
          onClick={() => toggle("underline")}
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Rouge" active={active.red} onClick={toggleRed}>
          <Baseline className="h-4 w-4" style={{ color: RED }} />
        </ToolbarButton>
      </div>

      {/* Zone d'édition */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onFocus={refreshActive}
        className={cn(
          "min-h-[340px] w-full px-4 py-3 text-sm leading-relaxed outline-none",
          "prose-editor"
        )}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // onPointerDown couvre souris ET tactile et se déclenche AVANT que le focus
  // ne quitte l'éditeur : preventDefault conserve donc la sélection/curseur
  // (indispensable sur mobile, où toucher un bouton faisait perdre la
  // sélection). On agit ici plutôt que sur onClick pour éviter tout blur.
  const handle = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick();
  };
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onPointerDown={handle}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md transition-colors touch-manipulation select-none",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

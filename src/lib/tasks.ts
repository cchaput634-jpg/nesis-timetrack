/**
 * Gestion des cases à cocher insérées dans le HTML des notes.
 *
 * Format inséré :
 *   <div class="tct-task">
 *     <input type="checkbox" data-tct-task ...>
 *     …
 *   </div>
 *
 * L'état coché est stocké via l'ATTRIBUT `checked` (setAttribute/removeAttribute),
 * jamais uniquement via la PROPRIÉTÉ. Cela garantit que la valeur est bien
 * sérialisée dans `innerHTML` et donc persistée en base.
 */

/** Sélecteur des cases à cocher gérées par ce système. */
export const TASK_CHECKBOX_SELECTOR =
  'input[type="checkbox"][data-tct-task]';

/** HTML inséré au clic sur le bouton « Case à cocher » de la barre d'outils. */
export const TASK_ITEM_TEMPLATE =
  '<div class="tct-task"><input type="checkbox" data-tct-task contenteditable="false">&nbsp;</div>';

/**
 * Si l'élément cliqué est une case à cocher de note, bascule son état et
 * renvoie `true`. Sinon renvoie `false` (l'appelant peut alors ignorer).
 *
 * Utilisable aussi bien en mode édition (contentEditable) qu'en mode
 * lecture (div avec `dangerouslySetInnerHTML`).
 */
export function toggleTaskCheckbox(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLInputElement)) return false;
  if (target.type !== "checkbox") return false;
  if (!target.hasAttribute("data-tct-task")) return false;

  if (target.hasAttribute("checked")) {
    target.removeAttribute("checked");
    target.checked = false;
  } else {
    target.setAttribute("checked", "");
    target.checked = true;
  }
  return true;
}

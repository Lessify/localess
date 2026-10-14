/**
 * Widths for Spartan dialogs, replacing the Material `panelClass` sizes that used to live in
 * `src/styles/_mat-dialog.scss`. Named rather than inlined so the call sites cannot drift apart.
 *
 * Three rules are baked into every value here:
 *
 * - **Width and max-width together.** `.spartan-dialog-content` is `w-full` inside an auto-sized
 *   CDK overlay and carries `sm:max-w-sm` (384px). `max-width` beats `width`, so a lone width
 *   utility is silently clamped to 384px.
 * - **`!` on every width utility.** The nova sheet lives inside `@scope (.style-nova)`, where
 *   proximity outranks source order - an unscoped utility loses to the component's own scoped rule
 *   for the same property however the CSS is ordered. Reordering does not help; `!` does. (The
 *   height utilities below need no `!`: the nova rule sets none of those properties.)
 * - **Bounded height.** The CDK overlay pane is `position: fixed`, so a box taller than the
 *   viewport cannot be scrolled into view - its footer, and the buttons in it, are simply
 *   unreachable. See `DIALOG_HEIGHT_BOUND`.
 */

/**
 * Caps the box at the viewport and keeps everything inside it reachable.
 *
 * `grid-rows-[minmax(0,1fr)]` is load-bearing, not decoration. `.spartan-dialog-content` is a grid
 * whose single item is the dialog component's host, and a grid item defaults to `min-height: auto`
 * - it refuses to shrink below its content. So `max-h` caps the box while the host grows straight
 * past it, carrying the footer off-screen (measured: 936px box, 2742px host, footer at 2786px).
 * Forcing the row to `minmax(0,1fr)` is what makes the host adopt the available height instead;
 * `min-height: 0` on the host alone does nothing, because the row is still `auto`-sized.
 *
 * That gives two behaviours, depending on the host:
 *
 * - A host laid out as `grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden` (the select dialogs)
 *   fits the box exactly: its middle row scrolls and the footer stays pinned.
 * - A plain `grid gap-4` host overflows its row, and `overflow-y-auto` makes the box scroll it, so
 *   a tall form still lets you reach its footer.
 */
const DIALOG_HEIGHT_BOUND = 'max-h-[calc(100dvh-2rem)] grid-rows-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto';

/** Was `panelClass: 'sm'` - min 500px, max 640px. The common form-dialog width. */
export const DIALOG_WIDTH_SM = `sm:w-[640px]! sm:max-w-[640px]! ${DIALOG_HEIGHT_BOUND}`;

/** Narrower than `sm`, for dialogs that are a sentence and two buttons. */
export const DIALOG_WIDTH_LG = `w-lg! max-w-lg! ${DIALOG_HEIGHT_BOUND}`;

/** Was `panelClass: 'xl'` - min 900px, max 1280px. */
export const DIALOG_WIDTH_XL = `sm:w-[1280px]! sm:max-w-[1280px]! ${DIALOG_HEIGHT_BOUND}`;

/**
 * Was `panelClass: 'full-screen'`. Tighter margins than `DIALOG_HEIGHT_BOUND`, as the Material
 * panel had; the same `minmax(0,1fr)` row is what keeps the footer in view.
 */
export const DIALOG_WIDTH_FULL_SCREEN =
  'w-[calc(100vw-24px)]! max-w-[calc(100vw-24px)]! max-h-[calc(100dvh-24px)] grid-rows-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto';

/** Was `panelClass: 'image-preview'`. The image's own min/max sizing lives on the `img` element. */
export const DIALOG_WIDTH_IMAGE_PREVIEW = `max-w-[calc(100vw-80px)]! ${DIALOG_HEIGHT_BOUND}`;

/**
 * Widths for Spartan dialogs, replacing the Material `panelClass` sizes that used to live in
 * `src/styles/_mat-dialog.scss`. Named rather than inlined so the call sites cannot drift apart.
 *
 * Two rules are baked into every value here:
 *
 * - **Width and max-width together.** `.spartan-dialog-content` is `w-full` inside an auto-sized
 *   CDK overlay and carries `sm:max-w-sm` (384px). `max-width` beats `width`, so a lone width
 *   utility is silently clamped to 384px.
 * - **`!` on every utility.** The nova sheet lives inside `@scope (.style-nova)`, where proximity
 *   outranks source order - an unscoped utility loses to the component's own scoped rule for the
 *   same property however the CSS is ordered. Reordering does not help; `!` does.
 */

/** Was `panelClass: 'sm'` - min 500px, max 640px. The common form-dialog width. */
export const DIALOG_WIDTH_SM = 'sm:w-[640px]! sm:max-w-[640px]!';

/** Narrower than `sm`, for dialogs that are a sentence and two buttons. */
export const DIALOG_WIDTH_LG = 'w-lg! max-w-lg!';

/** Was `panelClass: 'xl'` - min 900px, max 1280px. */
export const DIALOG_WIDTH_XL = 'sm:w-[1280px]! sm:max-w-[1280px]!';

/**
 * Was `panelClass: 'full-screen'`. Bounds the height too, as the Material panel did - the dialog's
 * own scrolling row is what actually scrolls, so the header and footer stay put.
 */
export const DIALOG_WIDTH_FULL_SCREEN = 'w-[calc(100vw-24px)]! max-w-[calc(100vw-24px)]! max-h-[calc(100vh-24px)]';

/** Was `panelClass: 'image-preview'`. The image's own min/max sizing lives on the `img` element. */
export const DIALOG_WIDTH_IMAGE_PREVIEW = 'max-w-[calc(100vw-80px)]!';

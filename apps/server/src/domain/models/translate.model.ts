/** How `content` should be interpreted by the translation provider. */
export type TranslateFormat = 'text' | 'html';

/** What both request shapes carry: where to translate from and to. */
interface TranslateLocales {
  sourceLocale: string;
  targetLocale: string;
}

/** Translate one string - the per-field button in the editors. */
export interface TranslateSingleData extends TranslateLocales {
  content: string;
  /**
   * Defaults to `text`. `html` puts the provider into tag-handling mode, where markup is passed
   * through untouched and only text nodes are translated - which is how a RICH_TEXT field is
   * translated without losing its structure or marks.
   */
  format?: TranslateFormat;
  items?: never;
}

/** Translate many fields at once - whole-document translation. Each item carries its own format. */
export interface TranslateBatchData extends TranslateLocales {
  items: TranslateItem[];
  content?: never;
  format?: never;
}

/**
 * The `translate` callable's request.
 *
 * A union rather than one shape with two optional halves, so `content` and `items` can be neither
 * sent together nor both omitted.
 *
 * The two halves pull their weight differently. Omitting both is rejected by the union alone -
 * each variant has a required field, so an object with neither satisfies no member. Sending both
 * is not: when the target is a union, TypeScript treats a property as known if it appears in *any*
 * member, so `{content, items}` passes the excess-property check and then satisfies
 * {@link TranslateSingleData} with `items` along for the ride. The `?: never` members exist to
 * close that, and to keep a top-level `format` out of batch mode, where each item carries its own.
 *
 * Narrow with a truthy check on `items` - `items` is declared on both sides, so it can be read off
 * the union directly, and the false branch narrows to {@link TranslateSingleData}.
 */
export type TranslateData = TranslateSingleData | TranslateBatchData;

/** One field to translate. `id` is opaque to the function and echoed back unchanged. */
export interface TranslateItem {
  id: string;
  content: string;
  format?: TranslateFormat;
}

/** Result of a batch translation. `failed` names what could not be translated and why. */
export interface TranslateBatchResult {
  items: { id: string; content: string }[];
  failed: { id: string; reason: string }[];
}

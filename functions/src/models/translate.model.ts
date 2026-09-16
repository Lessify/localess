/** How `content` should be interpreted by the translation provider. */
export type TranslateFormat = 'text' | 'html';

export interface TranslateData {
  content: string;
  sourceLocale: string | null;
  targetLocale: string;
  /**
   * Defaults to `text`. `html` puts the provider into tag-handling mode, where markup is passed
   * through untouched and only text nodes are translated - which is how a RICH_TEXT field is
   * translated without losing its structure or marks.
   */
  format?: TranslateFormat;
}

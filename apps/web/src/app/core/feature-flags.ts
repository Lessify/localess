/**
 * Features hidden in the UI until they are ready. The server API behind them stays.
 *
 * - `importExport`: Import/Export in Contents, Schemas, Assets and Translations, and the Tasks page they
 *   report to. Importing a Firebase-era export duplicates content and leaves Firestore ids in references
 *   (docs/roadmap/import-export.md).
 */
export const FEATURE_FLAGS: { readonly importExport: boolean } = {
  importExport: false,
};

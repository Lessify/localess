/**
 * Labels (translations, schemas): checked one by one as they are entered, since the form holds the whole list.
 * The list itself only has the server's limit (`zLabels`, apps/server/src/infra/http/zod.ts).
 */
export class LabelValidator {
  static readonly MAX_LABELS = 100;

  /** Why `label` can not be added to `labels`, or undefined when it can. */
  static error(label: string, labels: readonly string[]): string | undefined {
    if (/\s/.test(label)) return 'A label can not contain spaces.';
    if (label.length < 2) return 'A label needs at least 2 characters.';
    if (label.length > 50) return 'A label can have at most 50 characters.';
    if (labels.includes(label)) return `'${label}' is already added.`;
    return undefined;
  }
}

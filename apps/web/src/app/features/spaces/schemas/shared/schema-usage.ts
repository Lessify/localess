import { isSchemaInUse, SchemaUsage } from '@localess/shared';

/**
 * Where a schema is in use, one item per line (for `whitespace-pre-wrap` text): the fields of other schemas that refer
 * to it, then the contents using it (the first five, and how many more). `undefined` when nothing uses it.
 */
export function describeSchemaUsage(usage: SchemaUsage): string | undefined {
  if (!isSchemaInUse(usage)) return undefined;
  const lines: string[] = [];
  if (usage.fields.length) {
    lines.push('Referenced by the fields:', ...usage.fields.map(it => `• ${it.schema} › ${it.field}`));
  }
  const { count, first } = usage.contents;
  if (count) {
    lines.push(`Used by ${count} ${count === 1 ? 'content' : 'contents'}:`, ...first.map(it => `• ${it.name} (${it.fullSlug})`));
    if (count > first.length) lines.push(`• and ${count - first.length} more`);
  }
  return lines.join('\n');
}

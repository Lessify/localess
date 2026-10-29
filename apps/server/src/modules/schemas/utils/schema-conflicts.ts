import type { SchemaUsage } from '@localess/shared';

/**
 * The 409 messages of schema writes, shared by the service (its checks) and the repository (the same checks again
 * under the row lock, for what changed between the service's read and the write).
 */

/** "Schema 'card' is in use: referenced by 'page' field 'items'; used by 6 contents: Home (home), … and 1 more". */
export function inUseMessage(name: string, usage: SchemaUsage): string {
  const parts: string[] = [];
  if (usage.fields.length) parts.push(`referenced by ${usage.fields.map(it => `'${it.schema}' field '${it.field}'`).join(', ')}`);
  const { count, first } = usage.contents;
  if (count) {
    const more = count > first.length ? ` and ${count - first.length} more` : '';
    parts.push(
      `used by ${count} ${count === 1 ? 'content' : 'contents'}: ${first.map(it => `${it.name} (${it.fullSlug})`).join(', ')}${more}`,
    );
  }
  return `Schema '${name}' is in use: ${parts.join('; ')}`;
}

/** For schemas a write refers to that went since the service checked them. */
export function lostMessage(lost: string[]): string {
  return `${lost.length === 1 ? 'Schema' : 'Schemas'} ${lost.map(it => `'${it}'`).join(', ')} ${lost.length === 1 ? 'was' : 'were'} renamed or deleted meanwhile`;
}

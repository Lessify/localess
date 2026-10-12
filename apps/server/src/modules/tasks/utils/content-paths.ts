/**
 * Why a content import can not be written: a full slug the file uses twice, or one another content item of the space
 * keeps (after the import moved what it moves). The space's paths are unique (`contents_full_slug_idx`).
 */
export function contentPathProblems(
  existing: { id: string; fullSlug: string }[],
  imported: { id: string; fullSlug: string }[],
): string[] {
  const problems: string[] = [];
  const inFile = new Map<string, number>();
  for (const it of imported) inFile.set(it.fullSlug, (inFile.get(it.fullSlug) ?? 0) + 1);
  for (const [fullSlug, count] of inFile) if (count > 1) problems.push(`Path '${fullSlug}' is used twice in the file`);
  const importedIds = new Set(imported.map(it => it.id));
  const kept = new Map(existing.filter(it => !importedIds.has(it.id)).map(it => [it.fullSlug, it.id]));
  for (const it of imported) {
    if (kept.has(it.fullSlug)) problems.push(`Path '${it.fullSlug}' is used by another content item`);
  }
  return problems;
}

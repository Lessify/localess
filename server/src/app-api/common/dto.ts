/**
 * Row → the JSON shape the SPA already consumes (the Firestore document plus `id`): `null` columns
 * are omitted (Firestore had no field), `spaceId` is dropped, and Dates serialise as ISO strings.
 */
export function toDto<T extends object>(row: T, omit: readonly string[] = ['spaceId']): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined || omit.includes(key)) continue;
    dto[key] = value;
  }
  return dto;
}

/** Firestore values as the migration API returns them (ISO strings), or `{ seconds }` objects in older data. */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value);
  if (value && typeof value === 'object') {
    const seconds = (value as { seconds?: number; _seconds?: number }).seconds ?? (value as { _seconds?: number })._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return undefined;
}

export const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
export const strings = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((it): it is string => typeof it === 'string') : null;
export const obj = <T>(value: unknown): T | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null);

export function timestamps(data: Record<string, unknown>): { createdAt: Date; updatedAt: Date } {
  const createdAt = toDate(data['createdAt']) ?? new Date();
  return { createdAt, updatedAt: toDate(data['updatedAt']) ?? createdAt };
}

/** Content `data` as Firestore stored it: an object, or a JSON string. */
export function parseData(value: unknown): { data: Record<string, unknown> | null; invalid: boolean } {
  if (typeof value === 'string') {
    try {
      return { data: JSON.parse(value) as Record<string, unknown>, invalid: false };
    } catch {
      return { data: null, invalid: true };
    }
  }
  return { data: obj<Record<string, unknown>>(value), invalid: false };
}

/**
 * Whether `tmpPath` is a staged import upload of `spaceId` — `spaces/{spaceId}/tasks/tmp/{timestamp}`,
 * the only shape the frontend writes. The task trigger moves this object with Admin SDK rights, so
 * anything else (another space, an asset original, another task's export) must be refused.
 *
 * @param {string} spaceId space the task belongs to
 * @param {unknown} tmpPath `tmpPath` field from the task document
 * @return {boolean} true when the path is this space's staging folder
 */
export function isStagedImportPath(spaceId: string, tmpPath: unknown): tmpPath is string {
  if (typeof tmpPath !== 'string') return false;
  if (!/^[A-Za-z0-9]+$/.test(spaceId)) return false;
  return new RegExp(`^spaces/${spaceId}/tasks/tmp/[0-9]+$`).test(tmpPath);
}

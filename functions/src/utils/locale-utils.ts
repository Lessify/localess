import { bucket } from '../config';

/**
 * Resolve the storage path of a locale file, falling back to another path if the primary one doesn't exist.
 * @param {string} primaryPath Preferred file path
 * @param {string} fallbackPath File path to fall back to if the primary one is missing
 * @return {Promise<string | null>} the existing path, or null if neither file exists
 */
export async function resolveLocaleFilePath(primaryPath: string, fallbackPath: string): Promise<string | null> {
  const [primaryExists] = await bucket.file(primaryPath).exists();
  if (primaryExists) return primaryPath;
  if (primaryPath === fallbackPath) return null;
  const [fallbackExists] = await bucket.file(fallbackPath).exists();
  return fallbackExists ? fallbackPath : null;
}

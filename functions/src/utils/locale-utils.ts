import { bucket } from '../config';

export async function resolveLocaleFilePath(primaryPath: string, fallbackPath: string): Promise<string | null> {
  const [primaryExists] = await bucket.file(primaryPath).exists();
  if (primaryExists) return primaryPath;
  if (primaryPath === fallbackPath) return null;
  const [fallbackExists] = await bucket.file(fallbackPath).exists();
  return fallbackExists ? fallbackPath : null;
}

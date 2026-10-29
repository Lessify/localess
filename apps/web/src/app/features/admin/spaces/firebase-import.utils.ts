import type { FirebaseImport } from '@localess/shared';

/** The Firebase environment's host (`localess-prod.web.app`), or the origin as given when it is not a URL. */
export function originHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

/** Every warning of the run, the ones not kept included. */
export function warningCount(run: FirebaseImport): number {
  return run.stages.reduce((sum, it) => sum + (it.warningCount ?? 0), 0);
}

/** How long an ended run took ("31 s", "2 min 5 s"); undefined while it runs. */
export function durationText(run: FirebaseImport): string | undefined {
  if (!run.finishedAt) return undefined;
  const seconds = Math.max(0, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return seconds % 60 ? `${minutes} min ${seconds % 60} s` : `${minutes} min`;
}

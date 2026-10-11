import type { FirebaseImportStageName } from '@localess/shared';
import type { FirebaseClient } from './firebase-client.js';

/** How often a running import proves it is alive (see `FirebaseImportService.failInterrupted`). */
export const HEARTBEAT_MS = 30_000;

/** The run is no longer RUNNING (failed by recovery elsewhere): stop without writing. */
export class RunAbandoned extends Error {}

/** A stage that cannot go on, recorded as that stage's failure. */
export class StageFailure extends Error {
  constructor(
    readonly stage: FirebaseImportStageName,
    message: string,
  ) {
    super(message);
  }
}

/** What the runner hands a stage service: the source, the new space, and the stage's progress on the run. */
export interface ImportStage {
  client: FirebaseClient;
  sourceSpaceId: string;
  /** The new space's id. */
  spaceId: string;
  /** Records a warning on the stage (the first few kept, all counted). */
  warn(message: string): void;
  /** Sets the stage's count and saves the run; throws `RunAbandoned` when the run is no longer RUNNING. */
  progress(count: number): Promise<void>;
  /** Sets the stage's total, saved with the next progress. */
  total(total: number): void;
}

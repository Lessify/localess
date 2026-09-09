/**
 * Signals a bad invocation rather than a failed operation.
 *
 * The entry point prints the command's usage line for these and a plain error banner for
 * everything else, so a typo does not look like a provisioning failure.
 */
export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

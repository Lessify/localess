/** What a caught value says, for a log line or a stored message: an Error's message, anything else as a string. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import type { IntegrationId, IntegrationTestResult } from '@localess/shared';

/** What a provider error says about the integration: its key, its quota, the network, or nothing in particular. */
export type ProviderErrorKind = 'auth' | 'quota' | 'unreachable' | 'other';

/** An integration's behaviour on the server: checking values, the "Test & enable" call, reading its errors. */
export interface IntegrationProvider {
  id: IntegrationId;
  /** A problem with the values in plain words, before any network call; undefined when they look right. */
  validate(values: Record<string, string>): string | undefined;
  /** One cheap real call; never throws. */
  test(values: Record<string, string>): Promise<IntegrationTestResult>;
  classify(error: unknown): ProviderErrorKind;
}

/** A provider answered with an HTTP error (providers called with `fetch`). */
export class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`HTTP ${status}`);
  }
}

/** How long a test call may take before the provider counts as unreachable. */
export const TEST_TIMEOUT_MS = 10_000;

/** The test result for an error no rule knew. The provider's message is shown: it holds no secret of ours. */
export function unexpected(name: string, error: unknown): IntegrationTestResult {
  return {
    ok: false,
    reason: 'invalid',
    message: `${name} refused the request: ${error instanceof Error ? error.message : String(error)}`,
  };
}

export const missing = (label: string): string => `Enter the ${label}.`;

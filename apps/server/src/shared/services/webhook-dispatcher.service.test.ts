import { WebhookEvent } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import type { WebhookDispatcher } from './webhook-dispatcher.service.js';

/**
 * Each event with its data, checked by the compiler (`pnpm lint` type-checks the tests): the `@ts-expect-error` lines
 * fail the check if they ever compile.
 */
function signatures(dispatcher: WebhookDispatcher): void {
  dispatcher.dispatch('s1', WebhookEvent.CONTENT_PUBLISHED, { id: 'c1', fullSlug: 'blog/post' });
  dispatcher.dispatch('s1', WebhookEvent.TRANSLATION_CHANGED);
  // @ts-expect-error a content event needs the content's id and full slug
  dispatcher.dispatch('s1', WebhookEvent.CONTENT_CHANGED);
  // @ts-expect-error a translation event carries no data
  dispatcher.dispatch('s1', WebhookEvent.TRANSLATION_PUBLISHED, { id: 'c1', fullSlug: 'blog/post' });
}

describe('WebhookDispatcher.dispatch', () => {
  it('pairs each event with its data (a compile-time check)', () => {
    expect(signatures).toBeTypeOf('function');
  });
});

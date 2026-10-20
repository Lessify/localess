import type { UserRole } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import type { ChangeEvent } from '../../infra/events/event.service.js';
import { canReceive } from './event-access.js';

const S = '00000000-0000-7000-8000-000000000001';
const event = (entity: string, spaceId: string | null = S, id?: string): ChangeEvent => ({ spaceId, entity, id, op: 'updated' });
const as = (role: UserRole | null) => ({ id: 'me', role });

describe('canReceive', () => {
  it('lets admins receive every event, unknown entities included', () => {
    for (const entity of ['contents', 'tokens', 'users', 'webhook_logs', 'something-new']) {
      expect(canReceive(as('ADMIN'), event(entity)), entity).toBe(true);
    }
  });

  it('gives each role the entities its read endpoints allow', () => {
    const cases: [entity: string, allowed: UserRole[], denied: UserRole[]][] = [
      ['spaces', ['VIEWER', 'TRANSLATOR'], []],
      ['contents', ['VIEWER'], []],
      ['schemas', ['VIEWER'], []],
      ['assets', ['VIEWER'], []],
      ['translations', ['VIEWER'], []],
      ['tasks', ['EDITOR', 'DEVELOPER'], ['TRANSLATOR', 'VIEWER']],
      ['task_logs', ['EDITOR'], ['TRANSLATOR', 'VIEWER']],
      ['tokens', ['DEVELOPER'], ['EDITOR']],
      ['webhooks', ['DEVELOPER'], ['EDITOR']],
      ['webhook_logs', ['DEVELOPER'], ['EDITOR']],
    ];
    for (const [entity, allowed, denied] of cases) {
      for (const role of allowed) expect(canReceive(as(role), event(entity)), `${entity} for ${role}`).toBe(true);
      for (const role of denied) expect(canReceive(as(role), event(entity)), `${entity} for ${role}`).toBe(false);
    }
  });

  it('gives user events to admins, and to a user about themselves', () => {
    expect(canReceive(as('DEVELOPER'), event('users', null, 'other'))).toBe(false);
    expect(canReceive(as('VIEWER'), event('users', null, 'me'))).toBe(true);
  });

  it('keeps entities without an entry for admins only', () => {
    expect(canReceive(as('DEVELOPER'), event('something-new'))).toBe(false);
  });

  it('gives nothing to a user without a role', () => {
    expect(canReceive(as(null), event('spaces', null))).toBe(false);
    expect(canReceive(as(null), event('users', null, 'me'))).toBe(false);
  });
});

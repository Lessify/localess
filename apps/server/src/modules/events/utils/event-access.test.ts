import type { UserRole } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import type { ChangeEvent } from '../../../infra/events/event.service.js';
import { canReceive, isGlobal, isInSpace } from './event-access.js';

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
      ['tokens', ['DEVELOPER'], ['EDITOR']],
      ['webhooks', ['DEVELOPER'], ['EDITOR']],
      ['webhook_logs', ['DEVELOPER'], ['EDITOR']],
    ];
    for (const [entity, allowed, denied] of cases) {
      for (const role of allowed) expect(canReceive(as(role), event(entity)), `${entity} for ${role}`).toBe(true);
      for (const role of denied) expect(canReceive(as(role), event(entity)), `${entity} for ${role}`).toBe(false);
    }
  });

  it("gives a task's events (and its logs' and progress) to the roles that may start its kind", () => {
    const task = (entity: string, kind?: string): ChangeEvent => ({ spaceId: S, entity, id: 't', op: 'progress', kind });
    for (const entity of ['tasks', 'task_logs']) {
      expect(canReceive(as('DEVELOPER'), task(entity, 'SCHEMA_IMPORT'))).toBe(true);
      expect(canReceive(as('EDITOR'), task(entity, 'SCHEMA_IMPORT'))).toBe(false);
      expect(canReceive(as('TRANSLATOR'), task(entity, 'SCHEMA_IMPORT'))).toBe(false);
      expect(canReceive(as('TRANSLATOR'), task(entity, 'TRANSLATION_TRANSLATE'))).toBe(true);
      expect(canReceive(as('EDITOR'), task(entity, 'TRANSLATION_EXPORT'))).toBe(true);
      expect(canReceive(as('VIEWER'), task(entity, 'TRANSLATION_TRANSLATE'))).toBe(false);
      // Without its kind: admins only.
      expect(canReceive(as('DEVELOPER'), task(entity))).toBe(false);
      expect(canReceive(as('ADMIN'), task(entity))).toBe(true);
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

describe('isGlobal / isInSpace', () => {
  const OTHER = '00000000-0000-7000-8000-000000000002';

  it('puts spaces and users on the global stream, nothing of a space', () => {
    expect(isGlobal(event('spaces', null, S))).toBe(true);
    expect(isGlobal(event('users', null, 'u'))).toBe(true);
    expect(isGlobal(event('contents', S))).toBe(false);
    expect(isGlobal(event('tasks', S))).toBe(false);
  });

  it("puts on a space's stream its own events and the space itself, nothing of another space or of users", () => {
    expect(isInSpace(event('contents', S), S)).toBe(true);
    expect(isInSpace(event('tasks', S), S)).toBe(true);
    expect(isInSpace(event('spaces', null, S), S)).toBe(true);
    expect(isInSpace(event('spaces', null, OTHER), S)).toBe(false);
    expect(isInSpace(event('contents', OTHER), S)).toBe(false);
    expect(isInSpace(event('users', null, 'u'), S)).toBe(false);
  });
});

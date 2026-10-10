import { UserPermission } from '@localess/shared';
import { describe, expect, it } from 'vitest';
import { canReceive } from './event-access.js';
import type { ChangeEvent } from './events.service.js';

const S = '00000000-0000-7000-8000-000000000001';
const event = (entity: string, spaceId: string | null = S, id?: string): ChangeEvent => ({ spaceId, entity, id, op: 'updated' });
const custom = (...permissions: UserPermission[]) => ({ id: 'me', role: 'custom' as const, permissions });

describe('canReceive', () => {
  it('lets admins receive every event, unknown entities included', () => {
    const admin = { id: 'a', role: 'admin' as const };
    for (const entity of ['contents', 'tokens', 'users', 'webhook_logs', 'something-new']) {
      expect(canReceive(admin, event(entity)), entity).toBe(true);
    }
  });

  it('gives a custom user only the entities its read endpoints allow', () => {
    const cases: [string, UserPermission[], UserPermission[]][] = [
      ['contents', [UserPermission.CONTENT_READ], [UserPermission.SCHEMA_READ]],
      ['schemas', [UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ], [UserPermission.ASSET_READ]],
      ['assets', [UserPermission.ASSET_READ, UserPermission.CONTENT_READ], [UserPermission.SCHEMA_READ]],
      ['translations', [UserPermission.TRANSLATION_READ], [UserPermission.CONTENT_READ]],
      ['tasks', [UserPermission.CONTENT_EXPORT, UserPermission.TRANSLATION_IMPORT], [UserPermission.CONTENT_READ]],
      ['task_logs', [UserPermission.ASSET_IMPORT], [UserPermission.CONTENT_READ]],
      ['tokens', [UserPermission.SPACE_MANAGEMENT], [UserPermission.DEV_WEBHOOK]],
      ['webhooks', [UserPermission.SPACE_MANAGEMENT], [UserPermission.DEV_WEBHOOK]],
      ['webhook_logs', [UserPermission.SPACE_MANAGEMENT], [UserPermission.DEV_WEBHOOK]],
    ];
    for (const [entity, allowed, denied] of cases) {
      for (const permission of allowed) expect(canReceive(custom(permission), event(entity)), `${entity} with ${permission}`).toBe(true);
      for (const permission of denied) expect(canReceive(custom(permission), event(entity)), `${entity} with ${permission}`).toBe(false);
    }
  });

  it('gives spaces and settings to any role', () => {
    expect(canReceive(custom(), event('spaces', null))).toBe(true);
    expect(canReceive(custom(), event('settings', null))).toBe(true);
  });

  it('gives user events to user managers, and to a user about themselves', () => {
    expect(canReceive(custom(UserPermission.USER_MANAGEMENT), event('users', null, 'other'))).toBe(true);
    expect(canReceive(custom(), event('users', null, 'other'))).toBe(false);
    expect(canReceive(custom(), event('users', null, 'me'))).toBe(true);
  });

  it('keeps entities without an entry for admins only', () => {
    expect(canReceive(custom(...Object.values(UserPermission)), event('something-new'))).toBe(false);
  });

  it('gives nothing to a user without a role', () => {
    expect(canReceive({ id: 'me', role: null }, event('spaces', null))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { isUuid, newId, newUuid } from './id.js';

describe('ids', () => {
  it('newUuid makes time-ordered UUIDv7s', () => {
    const ids = Array.from({ length: 50 }, () => newUuid());
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it('newUuid(at) carries the given time in its first 48 bits', () => {
    const at = new Date('2024-05-06T07:08:09.123Z');
    const id = newUuid(at);
    expect(parseInt(id.replaceAll('-', '').slice(0, 12), 16)).toBe(at.getTime());
    expect(newUuid(at) < newUuid(new Date(at.getTime() + 1))).toBe(true);
  });

  it('isUuid accepts any UUID and nothing a uuid column would reject', () => {
    expect(isUuid(newUuid())).toBe(true);
    expect(isUuid('00000000-0000-4000-8000-000000000000')).toBe(true);
    expect(isUuid('0190A3B4-C5D6-7E8F-9012-3456789ABCDE')).toBe(true);
    for (const value of [newId(), 's1', '', '0190a3b4c5d67e8f90123456789abcde', '0190a3b4-c5d6-7e8f-9012-3456789abcdz', null, 42]) {
      expect(isUuid(value)).toBe(false);
    }
  });
});

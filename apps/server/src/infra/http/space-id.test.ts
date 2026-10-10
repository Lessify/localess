import { describe, expect, it } from 'vitest';
import { SpaceIdResolver } from './space-id.js';

/** Stands in for `db.select(...).from(spaces).where(legacy_id = ?)`, answering from a mutable row. */
function fakeDb(state: { row: { id: string } | undefined }) {
  return { select: () => ({ from: () => ({ where: async () => (state.row ? [state.row] : []) }) }) } as never;
}

describe('SpaceIdResolver', () => {
  it('passes UUIDs through and refuses malformed ids', async () => {
    const resolver = new SpaceIdResolver(fakeDb({ row: undefined }));
    expect(await resolver.resolve('00000000-0000-7000-8000-000000000001')).toBe('00000000-0000-7000-8000-000000000001');
    expect(await resolver.resolve('a/b')).toBeUndefined();
  });

  it('follows a Firebase space deleted and imported again under a new UUID', async () => {
    const state: { row: { id: string } | undefined } = { row: { id: '00000000-0000-7000-8000-00000000000a' } };
    const resolver = new SpaceIdResolver(fakeDb(state));
    expect(await resolver.resolve('FirestoreSpace')).toBe('00000000-0000-7000-8000-00000000000a');
    state.row = { id: '00000000-0000-7000-8000-00000000000b' };
    expect(await resolver.resolve('FirestoreSpace')).toBe('00000000-0000-7000-8000-00000000000b');
    state.row = undefined;
    expect(await resolver.resolve('FirestoreSpace')).toBeUndefined();
  });
});

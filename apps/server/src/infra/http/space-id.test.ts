import { describe, expect, it } from 'vitest';
import { SpaceIdResolver } from './space-id.js';

type Row = { id: string; importStatus: string | null };

/** Stands in for `db.select(...).from(spaces).where(id = ? | legacy_id = ?)`, answering from a mutable row. */
function fakeDb(state: { row: Row | undefined }) {
  return { select: () => ({ from: () => ({ where: async () => (state.row ? [state.row] : []) }) }) } as never;
}

describe('SpaceIdResolver', () => {
  it('looks UUIDs up with their import status, and refuses malformed ids', async () => {
    const row = { id: '00000000-0000-7000-8000-000000000001', importStatus: 'IMPORTING' };
    const resolver = new SpaceIdResolver(fakeDb({ row }));
    expect(await resolver.resolve(row.id)).toEqual(row);
    expect(await resolver.resolve('a/b')).toBeUndefined();
  });

  it('follows a Firebase space deleted and imported again under a new UUID', async () => {
    const state: { row: Row | undefined } = { row: { id: '00000000-0000-7000-8000-00000000000a', importStatus: null } };
    const resolver = new SpaceIdResolver(fakeDb(state));
    expect((await resolver.resolve('FirestoreSpace'))?.id).toBe('00000000-0000-7000-8000-00000000000a');
    state.row = { id: '00000000-0000-7000-8000-00000000000b', importStatus: null };
    expect((await resolver.resolve('FirestoreSpace'))?.id).toBe('00000000-0000-7000-8000-00000000000b');
    state.row = undefined;
    expect(await resolver.resolve('FirestoreSpace')).toBeUndefined();
  });
});

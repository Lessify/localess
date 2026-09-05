import { describe, expect, it, vi } from 'vitest';
import { getAllInChunks } from './get-all-in-chunks';

/** Minimal stand-in for a DocumentReference — only identity matters to the helper. */
function ref(id: string) {
  return { path: `spaces/s1/translations/${id}`, id } as never;
}

/** Fake Firestore whose getAll echoes a snapshot per requested ref, recording each call. */
function fakeFirestore(opts: { missing?: string[]; delayMs?: number } = {}) {
  const calls: string[][] = [];
  const inFlight = { active: 0, peak: 0 };
  const firestore = {
    getAll: async (...refs: never[]) => {
      const ids = (refs as unknown as { id: string }[]).map(r => r.id);
      calls.push(ids);
      inFlight.active++;
      inFlight.peak = Math.max(inFlight.peak, inFlight.active);
      if (opts.delayMs) await new Promise(r => setTimeout(r, opts.delayMs));
      inFlight.active--;
      return ids.map(id => ({ id, exists: !opts.missing?.includes(id) })) as never[];
    },
  };
  return { firestore: firestore as never, calls, inFlight };
}

describe('getAllInChunks', () => {
  it('returns an empty array and issues no request for empty input', async () => {
    const { firestore, calls } = fakeFirestore();
    expect(await getAllInChunks(firestore, [])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('issues a single request when refs fit in one chunk', async () => {
    const { firestore, calls } = fakeFirestore();
    const refs = ['a', 'b', 'c'].map(ref);
    const out = await getAllInChunks(firestore, refs, { chunkSize: 10 });
    expect(calls).toEqual([['a', 'b', 'c']]);
    expect(out.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('splits into chunks of at most chunkSize', async () => {
    const { firestore, calls } = fakeFirestore();
    const refs = ['a', 'b', 'c', 'd', 'e'].map(ref);
    await getAllInChunks(firestore, refs, { chunkSize: 2, concurrency: 1 });
    expect(calls).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('flattens results in the original ref order across chunks', async () => {
    const { firestore } = fakeFirestore({ delayMs: 1 });
    const ids = Array.from({ length: 25 }, (_, i) => `id-${i}`);
    const out = await getAllInChunks(firestore, ids.map(ref), { chunkSize: 4, concurrency: 3 });
    expect(out.map(s => s.id)).toEqual(ids);
  });

  it('returns one snapshot per ref, including missing documents', async () => {
    const { firestore } = fakeFirestore({ missing: ['b'] });
    const out = await getAllInChunks(firestore, ['a', 'b', 'c'].map(ref), { chunkSize: 2 });
    expect(out).toHaveLength(3);
    expect(out.map(s => s.exists)).toEqual([true, false, true]);
  });

  it('never runs more than `concurrency` requests at once', async () => {
    const { firestore, inFlight } = fakeFirestore({ delayMs: 2 });
    const refs = Array.from({ length: 40 }, (_, i) => ref(`id-${i}`));
    await getAllInChunks(firestore, refs, { chunkSize: 2, concurrency: 4 });
    expect(inFlight.peak).toBeLessThanOrEqual(4);
    expect(inFlight.peak).toBeGreaterThan(1);
  });

  it('propagates a request failure', async () => {
    const firestore = {
      getAll: async () => {
        throw new Error('unavailable');
      },
    } as never;
    await expect(getAllInChunks(firestore, [ref('a')])).rejects.toThrow('unavailable');
  });

  it('uses a safe default chunk size when none is given', async () => {
    const { firestore, calls } = fakeFirestore();
    await getAllInChunks(
      firestore,
      Array.from({ length: 301 }, (_, i) => ref(`id-${i}`))
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]).toHaveLength(300);
    expect(calls[1]).toHaveLength(1);
  });
});

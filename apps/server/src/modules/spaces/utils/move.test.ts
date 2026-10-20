import { describe, expect, it } from 'vitest';
import { moveTo } from './move.js';

const list = (...ids: string[]) => ids.map((id, position) => ({ id, position }));

describe('moveTo', () => {
  it('a move up or down changes the two rows it swaps', () => {
    expect(moveTo(list('a', 'b', 'c', 'd'), 'c', 1)).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ]);
    expect(moveTo(list('a', 'b', 'c', 'd'), 'b', 2)).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });

  it('a longer move shifts the rows between, and only those', () => {
    expect(moveTo(list('a', 'b', 'c', 'd', 'e'), 'd', 0)).toEqual([
      { id: 'd', position: 0 },
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
    ]);
    expect(moveTo(list('a', 'b', 'c', 'd', 'e'), 'a', 3)).toEqual([
      { id: 'b', position: 0 },
      { id: 'c', position: 1 },
      { id: 'd', position: 2 },
      { id: 'a', position: 3 },
    ]);
  });

  it('past the end is the last', () => {
    expect(moveTo(list('a', 'b', 'c'), 'a', 99999)).toEqual([
      { id: 'b', position: 0 },
      { id: 'c', position: 1 },
      { id: 'a', position: 2 },
    ]);
  });

  it('nothing changes when the row is already there', () => {
    expect(moveTo(list('a', 'b', 'c'), 'b', 1)).toEqual([]);
    expect(moveTo(list('a', 'b', 'c'), 'c', 99999)).toEqual([]);
  });

  it('closes the gaps a removal left', () => {
    const rows = [
      { id: 'a', position: 0 },
      { id: 'c', position: 2 },
      { id: 'd', position: 3 },
    ];
    expect(moveTo(rows, 'd', 1)).toEqual([{ id: 'd', position: 1 }]); // c stays at 2: [a, d, c]
    expect(moveTo(rows, 'a', 0)).toEqual([
      { id: 'c', position: 1 },
      { id: 'd', position: 2 },
    ]);
  });

  it('undefined for a row that is not in the list', () => {
    expect(moveTo(list('a', 'b'), 'x', 0)).toBeUndefined();
  });
});

/** A row of an ordered list: its id and the place it is stored at. */
export interface Positioned {
  id: string;
  position: number;
}

/**
 * The rows whose position changes when `id` moves to `position` in `rows` (in their order), the others shifting; past
 * the end is the last. The list ends numbered 0, 1, 2…: a gap left by a removal closes with the first move. `undefined`
 * when `id` is not in `rows`; `[]` when nothing changes.
 */
export function moveTo(rows: Positioned[], id: string, position: number): Positioned[] | undefined {
  const ids = rows.map(it => it.id);
  const from = ids.indexOf(id);
  if (from < 0) return undefined;
  ids.splice(from, 1);
  ids.splice(Math.min(position, ids.length), 0, id);
  const stored = new Map(rows.map(it => [it.id, it.position]));
  return ids.map((it, index) => ({ id: it, position: index })).filter(it => stored.get(it.id) !== it.position);
}

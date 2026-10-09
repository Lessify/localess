import { ContentData, Schema, SchemaFieldKind, SchemaType } from '@localess/shared';
import { copyBlock } from '@shared/utils/content';

/** A structure change on one block, offered by the preview toolbar. */
export type BlockAction = 'moveUp' | 'moveDown' | 'duplicate' | 'remove';

/** A block in a list (`SCHEMAS`) field. */
export interface ListBlockLocation {
  parent: ContentData;
  field: string;
  index: number;
}

/** A block in a single (`SCHEMA`) field. */
export interface SingleBlockLocation {
  parent: ContentData;
  field: string;
}

/** Where a block sits in the document: the block that holds it, and the field it's in. */
export type BlockLocation = ListBlockLocation | SingleBlockLocation;

export function isInList(location: BlockLocation): location is ListBlockLocation {
  return 'index' in location;
}

/** Finds the block with `id` below `root`; undefined for `root` itself or an unknown id. */
export function findBlock(root: ContentData, id: string, schemas: ReadonlyMap<string, Schema>): BlockLocation | undefined {
  const queue: ContentData[] = [root];
  for (let node = queue.shift(); node; node = queue.shift()) {
    const schema = schemas.get(node._schema);
    if (!schema || (schema.type !== SchemaType.ROOT && schema.type !== SchemaType.NODE)) continue;
    for (const field of schema.fields || []) {
      const value = node[field.name];
      if (field.kind === SchemaFieldKind.SCHEMA && value) {
        if ((value as ContentData)._id === id) return { parent: node, field: field.name };
        queue.push(value);
      } else if (field.kind === SchemaFieldKind.SCHEMAS && Array.isArray(value)) {
        const index = value.findIndex((it: ContentData) => it._id === id);
        if (index >= 0) return { parent: node, field: field.name, index };
        queue.push(...value);
      }
    }
  }
  return undefined;
}

/** The actions a block allows: a block in a single field can only be removed. */
export function blockActions(location: BlockLocation): BlockAction[] {
  if (!isInList(location)) return ['remove'];
  const actions: BlockAction[] = [];
  if (location.index > 0) actions.push('moveUp');
  if (location.index < listOf(location).length - 1) actions.push('moveDown');
  actions.push('duplicate', 'remove');
  return actions;
}

/** Swaps the block with the one before it; nothing happens for the first block. */
export function moveBlockUp(location: ListBlockLocation): void {
  swap(listOf(location), location.index, location.index - 1);
}

/** Swaps the block with the one after it; nothing happens for the last block. */
export function moveBlockDown(location: ListBlockLocation): void {
  swap(listOf(location), location.index, location.index + 1);
}

/** Inserts a copy of the block, with new ids, right after it. */
export function duplicateBlock(location: ListBlockLocation): void {
  const list = listOf(location);
  list.splice(location.index + 1, 0, copyBlock(list[location.index]));
}

/** Removes the block. Removing the last block of a list removes the field, as an empty list is stored. */
export function removeBlock(location: BlockLocation): void {
  const { parent, field } = location;
  if (!isInList(location)) {
    delete parent[field];
    return;
  }
  const list = listOf(location);
  list.splice(location.index, 1);
  if (list.length === 0) delete parent[field];
}

function listOf(location: ListBlockLocation): ContentData[] {
  return location.parent[location.field] as ContentData[];
}

function swap(list: ContentData[], from: number, to: number): void {
  if (to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
}

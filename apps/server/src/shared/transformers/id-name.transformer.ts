import type { IdName } from '@localess/shared';

export function toIdName<T extends IdName>(item: T): IdName {
  return { id: item.id, name: item.name };
}

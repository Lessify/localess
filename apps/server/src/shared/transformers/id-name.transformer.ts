import type { IdName } from '@localess/shared';
import { IdNameEntity } from '../entities/id-name.entity.js';

export function toIdName<T extends IdNameEntity>(item: T): IdName {
  return { id: item.id, name: item.name };
}

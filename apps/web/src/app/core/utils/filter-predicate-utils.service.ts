export interface FilterPredicateConfig<T> {
  searchFields: (row: T) => (string | undefined)[];
  filterFields?: { key: string; accessor: (row: T) => string[] | string | undefined }[];
}

function toArray(value: string[] | string | undefined): string[] {
  if (value === undefined) return [];
  const arr = Array.isArray(value) ? value : [value];
  // An empty string is a 'single' filter's unset state (its FormControl default), not a real selected value.
  return arr.filter(v => v !== '');
}

export class FilterPredicateUtils {
  static create<T>(config: FilterPredicateConfig<T>): (row: T, filter: string) => boolean {
    return (row: T, filter: string): boolean => {
      const value = JSON.parse(filter) as Record<string, string | string[]>;
      for (const field of config.filterFields ?? []) {
        const selected = toArray(value[field.key]);
        if (selected.length === 0) continue;
        const rowValues = toArray(field.accessor(row));
        if (!selected.some(v => rowValues.includes(v))) return false;
      }
      const search = (value['search'] as string | undefined)?.trim().toLowerCase();
      if (!search) return true;
      return config.searchFields(row).some(f => f?.toLowerCase().includes(search));
    };
  }
}

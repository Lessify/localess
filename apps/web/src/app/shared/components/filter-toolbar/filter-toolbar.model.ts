export interface FilterOption {
  value: string;
  label: string;
}

export type FilterMode = 'single' | 'multiple';

export interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
  mode: FilterMode;
}

export type FilterToolbarValue = Record<string, string | string[]> & { search: string };

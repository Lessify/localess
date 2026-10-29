import { computed, Signal } from '@angular/core';
import { PagedList } from '@core/utils/paged-list';
import { FilterDef, FilterToolbarValue } from '@shared/components/filter-toolbar/filter-toolbar.model';
import { TableSortState } from '@shared/components/table/table-sort.directive';

/** The scope filter's value for `deep=true`: the folder and everything under it. */
export const FOLDER_SCOPE_DEEP = 'deep';

/** The toolbar of a folder list: search (the name; for contents the slug too) and the scope. */
export const FOLDER_LIST_FILTERS: FilterDef[] = [
  {
    key: 'scope',
    label: 'Scope',
    mode: 'single',
    options: [
      { value: 'folder', label: 'This folder' },
      { value: FOLDER_SCOPE_DEEP, label: 'Including subfolders' },
    ],
  },
];

/**
 * The query of a folder tree's list paged on the server (`GET …/contents`, `GET …/assets`): the folder shown
 * (`parentId`, absent: the root), the search, the scope (`deep`), the sort, the page, and filters of the screen's own
 * (`fixed`: the picker's file type). The Contents table, the Assets page and their pickers use the same one, so they
 * behave alike. The folder is read from `folder` (`SpaceStore`'s on the pages, the picker's own signal), never
 * copied, so opening a folder asks for it once. A new folder, search, scope or sort starts again from the first page.
 */
export class FolderList {
  readonly list: PagedList;
  /** Everything under the folder (`deep`): rows then show their path, being from several folders. */
  readonly deep = computed(() => this.list.filters()['deep'] === 'true');
  /** A search or the scope narrows or widens the folder's list. */
  readonly filtering = computed(() => !!this.list.filters()['search'] || this.deep());

  constructor(
    folder: Signal<string | null>,
    size = 20,
    private readonly fixed: Record<string, string | undefined> = {},
  ) {
    this.list = new PagedList(size, () => ({ parentId: folder() ?? undefined }));
    this.list.filters.set({ ...fixed });
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({
      ...this.fixed,
      search: value.search?.trim() || undefined,
      deep: value['scope'] === FOLDER_SCOPE_DEEP ? 'true' : undefined,
    });
  }

  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }
}

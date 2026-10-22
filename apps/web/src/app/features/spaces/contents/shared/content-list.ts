import { computed } from '@angular/core';
import { PagedList } from '@core/utils/paged-list';
import { FilterDef, FilterToolbarValue } from '@shared/components/filter-toolbar/filter-toolbar.model';
import { TableSortState } from '@shared/components/table/table-sort.directive';

/** The scope filter's value for `deep=true`: the folder and everything under it. */
export const CONTENT_SCOPE_DEEP = 'deep';

/** The toolbar of a content list: search (the name or the slug) and the scope. */
export const CONTENT_LIST_FILTERS: FilterDef[] = [
  {
    key: 'scope',
    label: 'Scope',
    mode: 'single',
    options: [
      { value: 'folder', label: 'This folder' },
      { value: CONTENT_SCOPE_DEEP, label: 'Including subfolders' },
    ],
  },
];

/**
 * The query of a content list paged on the server (`GET …/contents`): the folder shown (`parentId`, absent: the root),
 * the search, the scope (`deep`), the sort, the page. The Contents table and the References picker use the same one, so
 * they behave alike. A new folder, search, scope or sort starts again from the first page.
 */
export class ContentList {
  readonly list = new PagedList(20);
  /** Everything under the folder (`deep`): rows then show their path, being from several folders. */
  readonly deep = computed(() => this.list.filters()['deep'] === 'true');
  /** A search or the scope narrows or widens the folder's list. */
  readonly filtering = computed(() => !!this.list.filters()['search'] || this.deep());

  /** The folder shown; `null`: the root. The search and the scope stay as they are. */
  setFolder(folderId: string | null): void {
    this.list.setFilters({ ...this.list.filters(), parentId: folderId ?? undefined });
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({
      parentId: this.list.filters()['parentId'],
      search: value.search?.trim() || undefined,
      deep: value['scope'] === CONTENT_SCOPE_DEEP ? 'true' : undefined,
    });
  }

  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }
}

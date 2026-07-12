import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  InjectionToken,
  input,
  InputSignal,
  model,
  ModelSignal,
  output,
  Signal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideChevronsLeft, lucideChevronsRight } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

export interface PageEvent {
  pageIndex: number;
  previousPageIndex?: number;
  pageSize: number;
  length: number;
}

/** Object that can be used to configure the default options for the paginator, mirroring MatPaginatorDefaultOptions. */
export interface PaginatorDefaultOptions {
  /** Number of items to display on a page. */
  pageSize?: number;
  /** The set of provided page size options to display to the user. */
  pageSizeOptions?: number[];
  /** Whether to hide the page size selection UI from the user. */
  hidePageSize?: boolean;
  /** Whether to show the first/last buttons UI to the user. */
  showFirstLastButtons?: boolean;
}

/** Injection token that can be used to provide the default options for the paginator, mirroring MAT_PAGINATOR_DEFAULT_OPTIONS. */
export const PAGINATOR_DEFAULT_OPTIONS = new InjectionToken<PaginatorDefaultOptions>('PAGINATOR_DEFAULT_OPTIONS');

@Component({
  selector: 'll-paginator',
  templateUrl: './paginator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', '[class.ll-paginator-sticky]': 'sticky()' },
  imports: [HlmButtonImports, HlmSelectImports, HlmIconImports, HlmTooltipImports],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideChevronsLeft, lucideChevronsRight })],
})
export class Paginator {
  private readonly defaults = inject(PAGINATOR_DEFAULT_OPTIONS, { optional: true });

  readonly length: InputSignal<number> = input.required<number>();
  readonly pageSizeOptions: InputSignal<number[]> = input<number[]>(this.defaults?.pageSizeOptions ?? [10, 25, 50]);
  readonly hidePageSize: InputSignal<boolean> = input(this.defaults?.hidePageSize ?? false);
  readonly showFirstLastButtons: InputSignal<boolean> = input(this.defaults?.showFirstLastButtons ?? false);
  readonly disabled: InputSignal<boolean> = input(false);
  /** Whether the paginator should stick to the bottom of a scrollable container, e.g. mat-paginator-sticky. */
  readonly sticky: InputSignal<boolean> = input(false);
  readonly pageIndex: ModelSignal<number> = model<number>(0);
  readonly pageSize: ModelSignal<number> = model<number>(this.defaults?.pageSize ?? 10);
  readonly page = output<PageEvent>();

  readonly pageCount: Signal<number> = computed(() => Math.max(1, Math.ceil(this.length() / this.pageSize())));
  readonly isFirstPage: Signal<boolean> = computed(() => this.pageIndex() === 0);
  readonly isLastPage: Signal<boolean> = computed(() => this.pageIndex() >= this.pageCount() - 1);

  constructor() {
    // Auto-clamp pageIndex when the underlying data shrinks (e.g. after a
    // filter reduces the row count), mirroring MatTableDataSource's
    // _updatePaginator, which does the same to avoid landing on an empty page.
    effect(() => {
      const maxIndex = this.pageCount() - 1;
      if (this.pageIndex() > maxIndex) {
        this.pageIndex.set(Math.max(0, maxIndex));
      }
    });
  }

  firstPage(): void {
    this.goToPage(0);
  }

  previousPage(): void {
    this.goToPage(this.pageIndex() - 1);
  }

  nextPage(): void {
    this.goToPage(this.pageIndex() + 1);
  }

  lastPage(): void {
    this.goToPage(this.pageCount() - 1);
  }

  /**
   * Changes the page size so that the first item displayed on the page will
   * still be displayed using the new page size, mirroring MatPaginator's
   * _changePageSize (rather than always resetting to page 0).
   */
  onPageSizeChange(pageSize: number): void {
    if (this.disabled()) return;
    const previousPageIndex = this.pageIndex();
    const startIndex = previousPageIndex * this.pageSize();
    this.pageSize.set(pageSize);
    const newPageIndex = Math.floor(startIndex / pageSize) || 0;
    this.pageIndex.set(newPageIndex);
    this.page.emit({ pageIndex: newPageIndex, previousPageIndex, pageSize, length: this.length() });
  }

  private goToPage(pageIndex: number): void {
    if (this.disabled()) return;
    const previousPageIndex = this.pageIndex();
    const clamped = Math.min(Math.max(pageIndex, 0), this.pageCount() - 1);
    if (clamped === previousPageIndex) return;
    this.pageIndex.set(clamped);
    this.page.emit({ pageIndex: clamped, previousPageIndex, pageSize: this.pageSize(), length: this.length() });
  }
}

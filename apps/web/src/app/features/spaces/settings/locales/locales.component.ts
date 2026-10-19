import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { LocaleService } from '@core/services/locale.service';
import { NotificationService } from '@core/services/notification.service';
import { SpaceService } from '@core/services/space.service';
import { SpaceStore } from '@core/stores/space.store';
import { PagedList } from '@core/utils/paged-list';
import { Locale } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideCheck, lucideEllipsisVertical, lucidePlus, lucideTrash, lucideX } from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSortState } from '@shared/components/table/table.imports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { combineLatest, EMPTY } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { LocaleDialogComponent } from './locale-dialog/locale-dialog.component';
import { LocaleDialogContext, LocaleDialogResult } from './locale-dialog/locale-dialog.model';
import { SpaceLocaleService } from './space-locale.service';

@Component({
  selector: 'll-space-settings-locales',
  templateUrl: './locales.component.html',
  styleUrls: ['./locales.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    LocaleIconComponent,
    HlmProgressImports,
    HlmButtonImports,
    HlmIconImports,
    HlmDropdownMenuImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEllipsisVertical,
      lucideTrash,
      lucideCheck,
      lucideX,
      lucideArrowUp,
      lucideArrowDown,
    }),
  ],
})
export class LocalesComponent {
  readonly localeService = inject(LocaleService);
  private readonly spaceLocaleService = inject(SpaceLocaleService);
  private readonly spaceService = inject(SpaceService);
  private readonly hlmDialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  /** The page shown: paged, sorted and searched on the server, in the space's order unless sorted otherwise. */
  readonly list = new PagedList(20);
  readonly total = signal(0);
  private readonly locales = signal<Locale[]>([]);
  readonly dataSource = new TableDataSource<Locale>(this.locales, this.injector);
  displayedColumns: string[] = ['id', 'icon', 'name', 'translateFrom', 'translateTo', 'isDefault', 'actions'];
  /** The default is the space's `defaultLocaleId`. */
  readonly defaultLocaleId = computed(() => this.spaceStore.selectedSpace()?.defaultLocaleId);

  private destroyRef = inject(DestroyRef);

  /**
   * The current query's page for the selected space, again whenever either changes or the space does (live). A failed
   * load is told and ends only that request: the next query change fetches again.
   */
  constructor() {
    combineLatest([toObservable(this.spaceStore.selectedSpaceId).pipe(filter(it => it !== undefined)), toObservable(this.list.params)])
      .pipe(
        switchMap(([spaceId, params]) =>
          this.spaceLocaleService.findAll(spaceId!, params).pipe(
            catchError(() => {
              this.notificationService.error('Locales can not be loaded.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.locales.set(page.items.flatMap(it => (it.locale ? [it.locale] : [])));
        this.total.set(page.total);
        this.list.onLoaded(page);
        this.isLoading.set(false);
      });
  }

  /** The search box (the locale's id or name), on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({ search: value.search?.trim() || undefined });
  }

  /** Cleared: back to the space's order. */
  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }

  /**
   * Two Spartan differences that matter here: `closed$` does not complete the way `afterClosed()`
   * does, hence `take(1)`, and the context is an object - `HlmDialogService` spreads it, so an
   * array would arrive as index keys.
   */
  openAddDialog(): void {
    const { id } = this.spaceStore.selectedSpace()!;
    const locales = this.spaceStore.locales();
    this.hlmDialog
      .open<LocaleDialogResult, LocaleDialogContext>(LocaleDialogComponent, {
        context: { locales },
        contentClass: 'w-lg! max-w-lg!',
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.spaceLocaleService.create(id, it!.locale)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Locale has been added.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Locale can not be added.');
        },
      });
  }

  openDeleteDialog(element: Locale): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.hlmDialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Locale',
          content: `Are you sure about deleting Locale with name '${element.name}'.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.spaceLocaleService.remove(spaceId!, element)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Locale '${element.name}' has been deleted.`);
        },
        error: () => {
          this.notificationService.error(`Locale '${element.name}' can not be deleted.`);
        },
      });
  }

  /**
   * Content stores the default locale's values in the bare field, so changing the default re-labels them: they are not
   * moved. Translations are keyed by locale and unaffected. Hence the confirmation.
   */
  openSetDefaultDialog(element: Locale): void {
    const space = this.spaceStore.selectedSpace();
    if (!space) return;
    this.hlmDialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Change Default Locale',
          content:
            `Make '${element.name}' the default locale instead of '${this.spaceStore.defaultLocale()?.name}'? ` +
            `Content values stored for the default locale are not moved: from now on they are read as '${element.name}'. ` +
            'Translations are not affected.',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.spaceService.setDefaultLocale(space.id, element)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Locale '${element.name}' is now the default locale.`);
        },
        error: () => {
          this.notificationService.error(`Locale '${element.name}' can not be made the default locale.`);
        },
      });
  }

  /** Whether `element` can move one place in the space's order (`-1` up, `1` down). */
  canMove(element: Locale, direction: -1 | 1): boolean {
    const locales = this.spaceStore.locales();
    const index = locales.findIndex(it => it.id === element.id);
    return index >= 0 && index + direction >= 0 && index + direction < locales.length;
  }

  /** Swaps `element` with its neighbour in the space's order, which is also the order everywhere else in the app. */
  move(element: Locale, direction: -1 | 1): void {
    const space = this.spaceStore.selectedSpace();
    if (!space || !this.canMove(element, direction)) return;
    const ids = this.spaceStore.locales().map(it => it.id);
    const index = ids.indexOf(element.id);
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    this.spaceLocaleService.reorder(space.id, ids).subscribe({
      error: () => {
        this.notificationService.error(`Locale '${element.name}' can not be moved.`);
      },
    });
  }

  /**
   * Google models source and target support separately, so the list reports them separately - a
   * locale usable as a source is not automatically usable as a target.
   */
  isTranslatableFrom(locale: string): boolean {
    return this.localeService.isLocaleTranslatableFrom(locale);
  }

  isTranslatableTo(locale: string): boolean {
    return this.localeService.isLocaleTranslatableTo(locale);
  }
}

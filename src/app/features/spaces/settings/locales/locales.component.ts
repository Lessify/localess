import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideEllipsisVertical, lucidePlus, lucideTrash, lucideX } from '@ng-icons/lucide';
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { Locale } from '@shared/models/locale.model';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap } from 'rxjs/operators';

import { LocaleDialogComponent } from './locale-dialog/locale-dialog.component';
import { LocaleDialogModel } from './locale-dialog/locale-dialog.model';

@Component({
  selector: 'll-space-settings-locales',
  templateUrl: './locales.component.html',
  styleUrls: ['./locales.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmProgressImports,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmDropdownMenuImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEllipsisVertical,
      lucideTrash,
      lucideCheck,
      lucideX,
    }),
  ],
})
export class LocalesComponent implements AfterViewInit {
  readonly localeService = inject(LocaleService);
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  private readonly locales = signal<Locale[]>([]);
  readonly dataSource = new TableDataSource<Locale>(this.locales, this.injector);
  displayedColumns: string[] = ['id', 'name', 'isTranslatable', 'isFallback', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor() {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<Locale>({
      searchFields: locale => [locale.id, locale.name],
    });
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined), // Skip initial data
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: space => {
          this.locales.set(space!.locales);
          this.isLoading.set(false);
        },
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.dataSource.filter = JSON.stringify(value);
  }

  openAddDialog(): void {
    const { id, locales } = this.spaceStore.selectedSpace()!;
    this.dialog
      .open<LocaleDialogComponent, Locale[], LocaleDialogModel>(LocaleDialogComponent, {
        panelClass: 'sm',
        data: locales,
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.localeService.create(id, it!.locale)),
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
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Locale',
          content: `Are you sure about deleting Locale with name '${element.name}'.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.localeService.delete(spaceId!, element)),
      )
      .subscribe({
        next: () => {
          this.locales.update(locales => locales.filter(x => x.id !== element.id));
          this.notificationService.success(`Locale '${element.name}' has been deleted.`);
        },
        error: () => {
          this.notificationService.error(`Locale '${element.name}' can not be deleted.`);
        },
      });
  }

  markAsFallback(element: Locale): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (spaceId) {
      this.localeService.markAsFallback(spaceId, element).subscribe({
        next: () => {
          this.notificationService.success(`Locale '${element.name}' has been marked as fallback.`);
        },
        error: () => {
          this.notificationService.error(`Locale '${element.name}' can not be marked as fallback.`);
        },
      });
    }
  }

  isSupport(locale: string): boolean {
    return this.localeService.isLocaleTranslatable(locale);
  }
}

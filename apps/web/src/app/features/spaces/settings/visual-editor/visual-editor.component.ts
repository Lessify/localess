import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/services/notification.service';
import { SpaceEnvironmentService } from '@core/services/space-environment.service';
import { SpaceStore } from '@core/stores/space.store';
import { PagedList } from '@core/utils/paged-list';
import { resolvePreviewUrl } from '@core/utils/preview-url';
import { SpaceEnvironment } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideEllipsisVertical, lucidePencil, lucidePlus, lucideTrash } from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSortState } from '@shared/components/table/table.imports';
import { SAMPLE_PREVIEW_CONTEXT } from '@shared/validators/space.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { combineLatest, EMPTY } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';

import { EnvironmentDialogComponent } from './environment-dialog/environment-dialog.component';
import { EnvironmentDialogContext, EnvironmentDialogResult } from './environment-dialog/environment-dialog.model';

/**
 * Visual Editor preview environments, managed one by one: add and edit in a dialog, delete with a confirmation, Move Up
 * / Move Down in the space's order (the first is the default). The table is one page from the server; every change is
 * saved at once and the page reloads on the space's change event.
 */
@Component({
  selector: 'll-space-settings-visual-editor',
  templateUrl: './visual-editor.component.html',
  styleUrls: ['./visual-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmProgressImports,
    HlmButtonImports,
    HlmIconImports,
    HlmDropdownMenuImports,
  ],
  providers: [provideIcons({ lucidePlus, lucidePencil, lucideTrash, lucideEllipsisVertical, lucideArrowUp, lucideArrowDown })],
})
export class VisualEditorComponent {
  private readonly spaceEnvironmentService = inject(SpaceEnvironmentService);
  private readonly notificationService = inject(NotificationService);
  private readonly hlmDialog = inject(HlmDialogService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  readonly spaceStore = inject(SpaceStore);

  isLoading = signal(true);

  /** The page shown: paged, sorted and searched on the server, in the space's order unless sorted otherwise. */
  readonly list = new PagedList(20);
  readonly total = signal(0);
  private readonly environments = signal<SpaceEnvironment[]>([]);
  readonly dataSource = new TableDataSource<SpaceEnvironment>(this.environments, this.injector);
  displayedColumns: string[] = ['name', 'url', 'actions'];
  /** The first environment in the space's order (whatever the table's sort or search). */
  readonly defaultEnvironmentId = computed(() => this.spaceStore.environments()[0]?.id);

  /**
   * The current query's page for the selected space, again whenever either changes or the space does (live). A failed
   * load is told and ends only that request: the next query change fetches again.
   */
  constructor() {
    combineLatest([toObservable(this.spaceStore.selectedSpaceId).pipe(filter(it => it !== undefined)), toObservable(this.list.params)])
      .pipe(
        switchMap(([spaceId, params]) =>
          this.spaceEnvironmentService.findAll(spaceId!, params).pipe(
            catchError(() => {
              this.notificationService.error('Environments can not be loaded.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.environments.set(page.items);
        this.total.set(page.total);
        this.list.onLoaded(page);
        this.isLoading.set(false);
      });
  }

  /** The search box (the name or the URL), on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({ search: value.search?.trim() || undefined });
  }

  /** Cleared: back to the space's order. */
  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }

  /** What an environment URL opens for the sample document. */
  exampleUrl(url: string): string {
    return resolvePreviewUrl(url, SAMPLE_PREVIEW_CONTEXT);
  }

  openAddDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId) return;
    this.openDialog(undefined)
      .pipe(switchMap(it => this.spaceEnvironmentService.create(spaceId, it)))
      .subscribe({
        next: () => this.notificationService.success('Environment has been added.'),
        error: () => this.notificationService.error('Environment can not be added.'),
      });
  }

  openEditDialog(environment: SpaceEnvironment): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId) return;
    this.openDialog({ name: environment.name, url: environment.url })
      .pipe(switchMap(it => this.spaceEnvironmentService.update(spaceId, environment.id, it).pipe(map(() => it.name))))
      .subscribe({
        // The name it was saved with: a rename shows the new one.
        next: name => this.notificationService.success(`Environment '${name}' has been updated.`),
        error: () => this.notificationService.error(`Environment '${environment.name}' can not be updated.`),
      });
  }

  openDeleteDialog(environment: SpaceEnvironment): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId) return;
    this.hlmDialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Environment',
          content: `Are you sure about deleting Environment '${environment.name}' (${environment.url})?`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.spaceEnvironmentService.remove(spaceId, environment.id)),
      )
      .subscribe({
        next: () => this.notificationService.success(`Environment '${environment.name}' has been deleted.`),
        error: () => this.notificationService.error(`Environment '${environment.name}' can not be deleted.`),
      });
  }

  /** Whether `environment` can move one place in the space's order (`-1` up, `1` down). */
  canMove(environment: SpaceEnvironment, direction: -1 | 1): boolean {
    const environments = this.spaceStore.environments();
    const index = environments.findIndex(it => it.id === environment.id);
    return index >= 0 && index + direction >= 0 && index + direction < environments.length;
  }

  /** Moves `environment` one place in the space's order (it swaps with its neighbour); the first is the default. */
  move(environment: SpaceEnvironment, direction: -1 | 1): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (!spaceId || !this.canMove(environment, direction)) return;
    const index = this.spaceStore.environments().findIndex(it => it.id === environment.id);
    this.spaceEnvironmentService.move(spaceId, environment.id, index + direction).subscribe({
      error: () => this.notificationService.error(`Environment '${environment.name}' can not be moved.`),
    });
  }

  /**
   * `closed$` does not complete the way `afterClosed()` does, hence `take(1)`; a dismissed dialog closes with
   * `undefined`.
   */
  private openDialog(context: EnvironmentDialogContext | undefined) {
    return this.hlmDialog
      .open<EnvironmentDialogResult, EnvironmentDialogContext>(EnvironmentDialogComponent, {
        context,
        contentClass: 'w-lg! max-w-lg!',
      })
      .closed$.pipe(
        take(1),
        filter((it): it is EnvironmentDialogResult => it !== undefined),
      );
  }
}

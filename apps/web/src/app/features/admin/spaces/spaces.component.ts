import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { SpaceService } from '@core/services/space.service';
import { PagedList } from '@core/utils/paged-list';
import { Space } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideCopy, lucidePencil, lucidePlus, lucideTrash } from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSortState } from '@shared/components/table/table.imports';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';

import { FirebaseImportDialogComponent } from './firebase-import-dialog/firebase-import-dialog.component';
import { FirebaseImportsDialogComponent } from './firebase-imports-dialog/firebase-imports-dialog.component';
import { SpaceCreateDialogComponent } from './space-create-dialog/space-create-dialog.component';
import { SpaceCreateDialogResult } from './space-create-dialog/space-create-dialog.model';
import { SpaceEditDialogComponent } from './space-edit-dialog/space-edit-dialog.component';
import { SpaceEditDialogContext, SpaceEditDialogResult } from './space-edit-dialog/space-edit-dialog.model';

/** `?action=create` opens the create dialog. Other values are ignored rather than dispatched. */
const CREATE_ACTION = 'create';

@Component({
  selector: 'll-spaces',
  templateUrl: './spaces.component.html',
  styleUrls: ['./spaces.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    CommonModule,
    RouterModule,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmIconImports,
    HlmProgressImports,
    HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideCopy,
      lucidePencil,
      lucideTrash,
    }),
  ],
})
export class SpacesComponent implements OnInit {
  private readonly spaceService = inject(SpaceService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  isLoading = signal(true);
  /** The page shown: paged, sorted and searched on the server (`GET /api/app/spaces`); by name unless sorted. */
  readonly list = new PagedList(20);
  readonly total = signal(0);
  private readonly spaces = signal<Space[]>([]);
  readonly dataSource = new TableDataSource<Space>(this.spaces, this.injector);
  displayedColumns: string[] = ['id', 'name', /*'createdAt',*/ 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  /**
   * `?action=create` from the URL, bound by the router's `withComponentInputBinding()`.
   */
  readonly action = input<string>();
  currentAction = linkedSignal<string | undefined>(() => {
    return this.action();
  });

  constructor() {
    effect(() => {
      if (this.currentAction() === CREATE_ACTION) {
        this.openAddDialog();
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  /** The search box (name, or the id), on the server; from the first page. */
  onFilterChange(value: FilterToolbarValue): void {
    this.list.setFilters({ search: value.search?.trim() || undefined });
  }

  onSortChange(sort: TableSortState): void {
    this.list.setSort(sort.active, sort.direction);
  }

  /**
   * The current query's page, again whenever the query changes or a space does (live). A failed load is told and
   * ends only that request: the next query change (page, sort, search) fetches again.
   */
  loadData(): void {
    toObservable(this.list.params, { injector: this.injector })
      .pipe(
        switchMap(params =>
          this.spaceService.findAll(params).pipe(
            catchError(() => {
              this.notificationService.error('Spaces can not be loaded.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.spaces.set(page.items);
        this.total.set(page.total);
        this.list.onLoaded(page);
        this.isLoading.set(false);
      });
  }

  openFirebaseImport(): void {
    this.dialog.open(FirebaseImportDialogComponent, { contentClass: DIALOG_WIDTH_SM });
  }

  openFirebaseImports(): void {
    this.dialog.open(FirebaseImportsDialogComponent, { contentClass: DIALOG_WIDTH_SM });
  }

  /** A space being imported from Firebase, or whose import failed, cannot be opened until it is done or deleted. */
  importLabel(space: Space): string | undefined {
    if (space.firebaseImport?.status === 'RUNNING') return 'Importing';
    if (space.firebaseImport?.status === 'FAILED') return 'Import failed';
    return undefined;
  }

  /** What to do about it: a failed import is not retried into its space. */
  /** The tooltip of a space being imported or whose import failed; `null`: none. */
  importHint(space: Space): string | null {
    if (space.firebaseImport?.status === 'RUNNING') return 'It opens once the import has finished';
    if (space.firebaseImport?.status === 'FAILED') return 'Delete the space and import it again';
    return null;
  }

  openAddDialog(): void {
    this.dialog
      .open<SpaceCreateDialogResult>(SpaceCreateDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        tap(() => this.clearAction()),
        filter((result): result is SpaceCreateDialogResult => result !== undefined),
        // One request: the server writes the space and its template's content in one transaction.
        switchMap(model => this.spaceService.create(model)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.notificationService.success('Space has been created.'),
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Space can not be created.');
        },
      });
  }

  /** `replaceUrl` so a dismissed dialog is not one Back press away from reopening itself. */
  private clearAction(): void {
    this.currentAction.set(undefined);
  }

  openEditDialog(element: Space): void {
    this.dialog
      .open<SpaceEditDialogResult, SpaceEditDialogContext>(SpaceEditDialogComponent, {
        context: {
          name: element.name,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.spaceService.update(element.id, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Space has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Space can not be updated.');
        },
      });
  }

  openDeleteDialog(element: Space): void {
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Space',
          content: `Are you sure about deleting Space with name '${element.name}'.\n This action can not be undone.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.spaceService.remove(element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Space '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Space '${element.name}' can not be deleted.`);
        },
      });
  }

  copied() {
    this.notificationService.success(`Space ID copied to clipboard.`);
  }
}

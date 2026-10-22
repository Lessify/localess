import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SpaceStore } from '@core/stores/space.store';
import { breadcrumbs } from '@core/utils/folder-tree';
import { Content, ContentDocument, ContentFolderSummary, ContentKind, Schema } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideFolderRoot } from '@ng-icons/lucide';
import { LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource } from '@shared/components/table/table.imports';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { CONTENT_LIST_FILTERS, ContentList } from '../content-list';
import { DocumentStatusComponent } from '../document-status/document-status.component';
import { ReferencesSelectDialogContext, ReferencesSelectDialogResult } from './references-select-dialog.model';

@Component({
  selector: 'll-references-select-dialog',
  templateUrl: './references-select-dialog.component.html',
  styleUrls: ['./references-select-dialog.component.scss'],
  // Three rows: header, a scrolling middle, pinned footer. `minmax(0,1fr)` is what lets the middle
  // row shrink below its content so it scrolls rather than pushing the footer off-screen.
  host: { class: 'grid grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmDialogImports,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    CommonModule,
    HlmBreadcrumbImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmIconImports,
    HlmProgressImports,
    HlmTooltipImports,
    DocumentStatusComponent,
  ],
  providers: [
    provideIcons({
      lucideFolderRoot,
      lucideFolder,
    }),
  ],
})
export class ReferencesSelectDialogComponent {
  private readonly spaceStore = inject(SpaceStore);
  private readonly notificationService = inject(NotificationService);
  private readonly contentService = inject(ContentService);
  readonly fe = inject(FormErrorHandlerService);
  private readonly injector = inject(Injector);
  private readonly dialogRef = inject<BrnDialogRef<ReferencesSelectDialogResult>>(BrnDialogRef);

  /** Required: scopes the browser to a space, and `multiple` decides the selection mode. */
  private readonly context = injectBrnDialogContext<ReferencesSelectDialogContext>();

  /** Every schema by name, from `SpaceStore` (live): a document's schema column. */
  readonly schemasMapByName = computed(() => new Map<string, Schema>(this.spaceStore.schemas().map(it => [it.name, it])));
  /** The same paged query as the Contents table: folder, search, scope, sort, page. */
  readonly contentList = new ContentList();
  readonly filters = CONTENT_LIST_FILTERS;
  readonly total = signal(0);
  contents = signal<Content[]>([]);
  readonly dataSource = new TableDataSource<Content>(this.contents, this.injector);
  displayedColumns: string[] = ['select', 'status', 'name', 'schema', 'updatedAt'];
  selection = new SelectionModel<ContentDocument>(this.context.multiple, [], undefined, (o1, o2) => o1.id === o2.id);
  /** Every folder of the space: the breadcrumbs are built from it. */
  private readonly folders = toSignal(this.contentService.findAllFolders(this.context.spaceId), {
    initialValue: [] as ContentFolderSummary[],
  });
  private readonly folderMap = computed(() => new Map(this.folders().map(it => [it.id, it])));
  /** The folder shown; `null`: the root. */
  readonly folderId = signal<string | null>(null);
  /** The folders from the root down to the one shown. */
  readonly trail = computed(() => breadcrumbs(this.folderMap(), this.folderId()));

  private destroyRef = inject(DestroyRef);
  // Loading
  isLoading = signal(true);

  /** The query's page, again whenever it changes (and live). A failed load is told and ends only that request. */
  constructor() {
    toObservable(this.contentList.list.params)
      .pipe(
        switchMap(params =>
          this.contentService.findPage(this.context.spaceId, params).pipe(
            catchError(() => {
              this.notificationService.error('Contents can not be loaded.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.contents.set(page.items);
        this.total.set(page.total);
        this.contentList.list.onLoaded(page);
        this.isLoading.set(false);
      });
  }

  /** A breadcrumb: a folder, or `null` for the root. */
  navigateToFolder(folderId: string | null) {
    this.folderId.set(folderId);
    this.contentList.setFolder(folderId);
  }

  onRowSelect(element: Content): void {
    if (element.kind === ContentKind.DOCUMENT) {
      this.selection.toggle(element);
      return;
    } else if (element.kind === ContentKind.FOLDER) {
      this.navigateToFolder(element.id);
    }
  }

  save(): void {
    this.dialogRef.close(this.selection.selected as ReferencesSelectDialogResult);
  }
}

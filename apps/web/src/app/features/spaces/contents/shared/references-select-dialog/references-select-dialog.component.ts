import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SpaceStore } from '@core/stores/space.store';
import { FOLDER_LIST_FILTERS, FolderList } from '@core/utils/folder-list';
import { breadcrumbs } from '@core/utils/folder-tree';
import { pagedResource } from '@core/utils/paged-resource';
import { Content, ContentDocument, ContentKind, Schema } from '@localess/shared';
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
  /** The folder shown; `null`: the root. */
  readonly folderId = signal<string | null>(null);
  /** The same paged query as the Contents table: folder, search, scope, sort, page. */
  readonly contentList = new FolderList(this.folderId);
  readonly filters = FOLDER_LIST_FILTERS;
  /** The page shown, live. */
  readonly page = pagedResource({
    list: this.contentList.list,
    load: params => this.contentService.findPage(this.context.spaceId, params),
    error: 'Contents can not be loaded.',
  });
  readonly dataSource = new TableDataSource<Content>(this.page.items, this.injector);
  displayedColumns: string[] = ['select', 'status', 'name', 'schema', 'updatedAt'];
  selection = new SelectionModel<ContentDocument>(this.context.multiple, [], undefined, (o1, o2) => o1.id === o2.id);
  /** Every folder of the space, from `SpaceStore` (live): the breadcrumbs are built from it. */
  private readonly folderMap = computed(() => new Map(this.spaceStore.contentFolders().map(it => [it.id, it])));
  /** The folders from the root down to the one shown. */
  readonly trail = computed(() => breadcrumbs(this.folderMap(), this.folderId()));

  private destroyRef = inject(DestroyRef);
  /** A breadcrumb: a folder, or `null` for the root. */
  navigateToFolder(folderId: string | null) {
    this.folderId.set(folderId);
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

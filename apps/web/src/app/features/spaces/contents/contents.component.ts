import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, input } from '@angular/core';
import { Router } from '@angular/router';
import { FEATURE_FLAGS } from '@core/feature-flags';
import { ContentService } from '@core/services/content.service';
import { NotificationService } from '@core/services/notification.service';
import { SpaceTokenService } from '@core/services/space-token.service';
import { TaskService } from '@core/services/task.service';
import { SpaceStore } from '@core/stores/space.store';
import { apiErrorMessage } from '@core/utils/api-error';
import { FOLDER_LIST_FILTERS, FolderList } from '@core/utils/folder-list';
import { breadcrumbs } from '@core/utils/folder-tree';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { pagedResource } from '@core/utils/paged-resource';
import {
  Content,
  ContentDocument,
  ContentDocumentCreate,
  ContentFolderCreate,
  ContentKind,
  ContentUpdate,
  Schema,
  SchemaType,
  TokenType,
} from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideBookCopy,
  lucideCloudDownload,
  lucideCopy,
  lucideEllipsisVertical,
  lucideExternalLink,
  lucideFilePlus,
  lucideFolder,
  lucideFolderInput,
  lucideFolderPlus,
  lucideFolderRoot,
  lucideLink,
  lucidePencil,
  lucidePlus,
  lucideTrash,
  lucideUpload,
  lucideUploadCloud,
  lucideWebhookOff,
} from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource } from '@shared/components/table/table.imports';
import { sortSchema } from '@shared/models/schema.model';
import { TOKEN_TYPE_INFO } from '@shared/models/token.model';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap, take, tap } from 'rxjs/operators';

import { AddDocumentDialogComponent, AddDocumentDialogContext } from './add-document-dialog';
import { AddFolderDialogComponent, AddFolderDialogContext } from './add-folder-dialog';
import { EditDialogComponent, EditDialogContext } from './edit-dialog';
import { ExportDialogComponent, ExportDialogContext, ExportDialogResult } from './export-dialog';
import { ImportDialogComponent, ImportDialogResult } from './import-dialog';
import { MoveDialogComponent, MoveDialogContext, MoveDialogResult } from './move-dialog';
import { DocumentStatusComponent } from './shared/document-status/document-status.component';

@Component({
  selector: 'll-contents',
  templateUrl: './contents.component.html',
  styleUrls: ['./contents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HasRolePipe,
    CommonModule,
    ClipboardModule,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmButtonImports,
    HlmIconImports,
    HlmDropdownMenuImports,
    HlmBreadcrumbImports,
    HlmProgressImports,
    HlmTooltipImports,
    DocumentStatusComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEllipsisVertical,
      lucideCloudDownload,
      lucideUploadCloud,
      lucideLink,
      lucideFolderPlus,
      lucideFilePlus,
      lucideExternalLink,
      lucideFolderRoot,
      lucideUpload,
      lucidePencil,
      lucideCopy,
      lucideFolderInput,
      lucideTrash,
      lucideFolder,
      lucideWebhookOff,
      lucideBookCopy,
    }),
  ],
})
export class ContentsComponent {
  protected readonly importExportEnabled = FEATURE_FLAGS.importExport;
  private readonly router = inject(Router);
  private readonly contentService = inject(ContentService);
  private readonly spaceTokenService = inject(SpaceTokenService);
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(HlmDialogService);

  private readonly hlmDialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  // Input
  spaceId = input.required<string>();

  spaceStore = inject(SpaceStore);

  /**
   * The folder shown (`SpaceStore.contentFolderId`): paged, sorted and searched on the server (`GET …/contents`,
   * without the documents' data).
   */
  readonly contentList = new FolderList(this.spaceStore.contentFolderId);
  readonly filters = FOLDER_LIST_FILTERS;
  /** The page shown, live. */
  readonly page = pagedResource({
    list: this.contentList.list,
    load: params => this.contentService.findPage(this.spaceId(), params),
    error: 'Contents can not be loaded.',
  });
  readonly dataSource = new TableDataSource<Content>(this.page.items, this.injector);
  displayedColumns: string[] = ['status', 'name', 'schema', /*'publishedAt', 'createdAt',*/ 'updatedAt', 'actions'];

  /** The ROOT schemas a document can be created with, from `SpaceStore` (live). */
  readonly schemas = computed(() =>
    this.spaceStore
      .schemas()
      .filter(it => it.type === SchemaType.ROOT)
      .sort(sortSchema),
  );
  /** Every schema by name: a document's schema column. */
  readonly schemasMapByName = computed(() => new Map<string, Schema>(this.spaceStore.schemas().map(it => [it.name, it])));

  /** Every folder of the space, from `SpaceStore` (live): the breadcrumbs are built from it. */
  private readonly folderMap = computed(() => new Map(this.spaceStore.contentFolders().map(it => [it.id, it])));
  /** The folders from the root down to the one shown. */
  readonly trail = computed(() => breadcrumbs(this.folderMap(), this.spaceStore.contentFolderId()));

  /** The folder shown; `undefined`: the root. */
  private get folderId(): string | undefined {
    return this.spaceStore.contentFolderId() ?? undefined;
  }

  private destroyRef = inject(DestroyRef);

  openAddDocumentDialog(): void {
    this.dialog
      .open<ContentDocumentCreate, AddDocumentDialogContext>(AddDocumentDialogComponent, {
        context: {
          schemas: this.schemas(),
          ...this.reservedIn(this.spaceStore.contentFolderId() ?? undefined),
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.contentService.createDocument(this.spaceId(), this.folderId, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Document has been created.');
        },
        error: (err: unknown) => {
          this.notificationService.error(apiErrorMessage(err, 'Document can not be created.'));
        },
      });
  }

  openAddFolderDialog(): void {
    this.dialog
      .open<ContentFolderCreate, AddFolderDialogContext>(AddFolderDialogComponent, {
        context: this.reservedIn(this.spaceStore.contentFolderId() ?? undefined),
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.contentService.createFolder(this.spaceId(), this.folderId, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Folder has been created.');
        },
        error: (err: unknown) => {
          this.notificationService.error(apiErrorMessage(err, 'Folder can not be created.'));
        },
      });
  }

  openEditDialog(element: Content): void {
    this.dialog
      .open<ContentUpdate, EditDialogContext>(EditDialogComponent, {
        context: {
          content: ObjectUtils.clone(element),
          ...this.reservedIn(element.parentId),
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.contentService.update(this.spaceId(), element.id, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content has been updated.');
        },
        error: (err: unknown) => {
          this.notificationService.error(apiErrorMessage(err, 'Content can not be updated.'));
        },
      });
  }

  openDeleteDialog(element: Content): void {
    let title = '';
    let content = '';
    let messageSuccess = '';
    let messageError = '';
    if (element.kind === ContentKind.FOLDER) {
      title = 'Delete Folder';
      content = `Are you sure about deleting Folder with name: ${element.name}.\n All sub folders and documents will be deleted.`;
      messageSuccess = `Folder '${element.name}' has been deleted.`;
      messageError = `Folder '${element.name}' can not be deleted.`;
    } else if (element.kind === ContentKind.DOCUMENT) {
      title = 'Delete Document';
      content = `Are you sure about deleting Document with name: ${element.name}.`;
      messageSuccess = `Document '${element.name}' has been deleted.`;
      messageError = `Document '${element.name}' can not be deleted.`;
    }
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: title,
          content: content,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.contentService.remove(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(messageSuccess);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(apiErrorMessage(err, messageError));
        },
      });
  }

  openMoveDialog(element: Content) {
    this.dialog
      .open<MoveDialogResult, MoveDialogContext>(MoveDialogComponent, {
        context: {
          spaceId: this.spaceId(),
          content: element,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.contentService.move(this.spaceId(), element.id, it!.parentId)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content has been moved.');
        },
        error: (err: unknown) => {
          this.notificationService.error(apiErrorMessage(err, 'Content can not be moved.'));
        },
      });
  }

  openCloneDialog(element: ContentDocument): void {
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Clone Document',
          content: `Clone the document ${element.name}?`,
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.contentService.clone(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Document '${element.name}' has been cloned.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(apiErrorMessage(err, `Document '${element.name}' can not be cloned.`));
        },
      });
  }

  openPublishDialog(element: Content): void {
    let title = '';
    let content = '';
    let messageSuccess = '';
    let messageError = '';
    if (element.kind === ContentKind.FOLDER) {
      title = 'Publish Folder';
      content = `Are you sure about publishing the Folder with the name: ${element.name}.\n All sub folders and documents will be published.`;
      messageSuccess = `Folder '${element.name}' has been published.`;
      messageError = `Folder '${element.name}' can not be published.`;
    } else if (element.kind === ContentKind.DOCUMENT) {
      title = 'Publish Document';
      content = `Are you sure about publishing the Document with the name: ${element.name}.`;
      messageSuccess = `Document '${element.name}' has been published.`;
      messageError = `Document '${element.name}' can not be published.`;
    }
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: title,
          content: content,
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.contentService.publish(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(messageSuccess);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(messageError);
        },
      });
  }

  openUnpublishDialog(element: Content): void {
    let title = '';
    let content = '';
    let messageSuccess = '';
    let messageError = '';
    if (element.kind === ContentKind.FOLDER) {
      title = 'Unpublish Folder';
      content = `Are you sure about unpublishing the Folder with the name: ${element.name}.\n All sub folders and documents will be unpublished.`;
      messageSuccess = `Folder '${element.name}' has been unpublished.`;
      messageError = `Folder '${element.name}' can not be unpublished.`;
    } else if (element.kind === ContentKind.DOCUMENT) {
      title = 'Unpublish Document';
      content = `Are you sure about unpublishing the Document with the name: ${element.name}.`;
      messageSuccess = `Document '${element.name}' has been unpublished.`;
      messageError = `Document '${element.name}' can not be unpublished.`;
    }
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: title,
          content: content,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.contentService.unpublish(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(messageSuccess);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(messageError);
        },
      });
  }

  onRowSelect(element: Content): void {
    if (element.kind === ContentKind.DOCUMENT) {
      if (this.schemasMapByName().has(element.schema)) {
        this.router.navigate(['features', 'spaces', this.spaceId(), 'contents', element.id]);
      } else {
        this.notificationService.error(`Content Schema can not be found.`);
      }
      return;
    }

    if (element.kind === ContentKind.FOLDER) {
      this.spaceStore.changeContentFolder(element.id);
    }
  }

  /** The names and slugs taken in a folder (`undefined`: the root), from `SpaceStore`'s list of every content. */
  private reservedIn(parentId: string | undefined): { reservedNames: string[]; reservedSlugs: string[] } {
    const siblings = this.spaceStore.contents().filter(it => it.parentId === parentId);
    return { reservedNames: siblings.map(it => it.name), reservedSlugs: siblings.map(it => it.slug) };
  }

  /** A breadcrumb: a folder, or `null` for the root. */
  navigateToFolder(folderId: string | null) {
    if (folderId === this.spaceStore.contentFolderId()) return;
    this.spaceStore.changeContentFolder(folderId);
  }

  openApiV1InNewTab(token: string) {
    const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId()}/links`);
    url.searchParams.set('token', token);
    window.open(url, '_blank');
  }

  openLinksV1InNewTab(): void {
    this.withApiToken([TokenType.PUBLIC, TokenType.PREVIEW], token => this.openApiV1InNewTab(token));
  }

  /** Opens `open` with the current value of the first of `types` the space has; a toast when it has none or the lookup fails. */
  private withApiToken(types: TokenType[], open: (token: string) => void): void {
    this.spaceTokenService.firstValue(this.spaceId(), types).subscribe({
      next: token => {
        if (token) open(token);
        else this.notificationService.error(`Please create a ${TOKEN_TYPE_INFO[types[0]].label} Token in your Space Settings`);
      },
      error: () => this.notificationService.error('Tokens could not be loaded'),
    });
  }

  openImportDialog() {
    this.dialog
      .open<ImportDialogResult>(ImportDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        tap(console.log),
        switchMap(it => this.taskService.createContentImportTask(this.spaceId(), it!.file)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content Import Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: () => {
          this.notificationService.error('Content Import Task can not be created.');
        },
      });
  }

  openExportDialog() {
    this.dialog
      .open<ExportDialogResult, ExportDialogContext>(ExportDialogComponent, {
        context: {
          spaceId: this.spaceId(),
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createContentExportTask(this.spaceId(), it?.path)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content Export Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Content Export Task can not be created.');
        },
      });
  }

  copiedSlug() {
    this.notificationService.success(`Slug copied to clipboard.`);
  }

  copiedFullSlug() {
    this.notificationService.success(`Full Slug copied to clipboard.`);
  }
}

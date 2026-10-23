import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FEATURE_FLAGS } from '@core/feature-flags';
import { AssetService } from '@core/services/asset.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { UnsplashService } from '@core/services/unsplash.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { apiErrorMessage } from '@core/utils/api-error';
import { FOLDER_LIST_FILTERS, FolderList } from '@core/utils/folder-list';
import { assetLocation, breadcrumbs } from '@core/utils/folder-tree';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { pagedResource } from '@core/utils/paged-resource';
import { uploadErrorMessage } from '@core/utils/upload-error';
import { Asset, AssetFile, AssetFolder, AssetKind } from '@localess/shared';
import { UnsplashPhoto } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCloudDownload,
  lucideDownload,
  lucideEllipsisVertical,
  lucideFile,
  lucideFileDigit,
  lucideFileImage,
  lucideFileMusic,
  lucideFileSymlink,
  lucideFileText,
  lucideFileUp,
  lucideFileVideoCamera,
  lucideFolder,
  lucideFolderInput,
  lucideFolderPlus,
  lucideFolderRoot,
  lucideLayoutGrid,
  lucideLayoutList,
  lucideLoaderCircle,
  lucidePencil,
  lucideRefreshCcwDot,
  lucideTrash,
  lucideUpload,
  lucideUploadCloud,
} from '@ng-icons/lucide';
import { tablerBrandUnsplash } from '@ng-icons/tabler-icons';
import { AssetCardComponent } from '@shared/components/asset-card/asset-card.component';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { DIALOG_WIDTH_FULL_SCREEN, DIALOG_WIDTH_IMAGE_PREVIEW, DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog.component';
import { ImagePreviewDialogContext } from '@shared/components/image-preview-dialog/image-preview-dialog.model';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource } from '@shared/components/table/table.imports';
import { UnsplashAssetsSelectDialogComponent, UnsplashAssetsSelectDialogContext } from '@shared/components/unsplash-assets-select-dialog';
import { FileDragAndDropDirective } from '@shared/directives/file-drag-and-drop.directive';
import {
  AssetFileImport,
  AssetFileUpdateForm,
  AssetFolderCreateForm,
  AssetFolderUpdateForm,
  fileIcon as resolveFileIcon,
  filePreview as isPreviewableFileType,
} from '@shared/models/asset.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, of, Subject } from 'rxjs';
import { catchError, concatMap, filter, finalize, map, switchMap, take, tap } from 'rxjs/operators';

import { AddFolderDialogComponent } from './add-folder-dialog/add-folder-dialog.component';
import { EditFileDialogComponent } from './edit-file-dialog/edit-file-dialog.component';
import { EditFileDialogContext } from './edit-file-dialog/edit-file-dialog.model';
import { EditFolderDialogComponent } from './edit-folder-dialog/edit-folder-dialog.component';
import { EditFolderDialogContext } from './edit-folder-dialog/edit-folder-dialog.model';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogContext, ExportDialogResult } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogResult } from './import-dialog/import-dialog.model';
import { MoveDialogComponent, MoveDialogContext, MoveDialogResult } from './move-dialog';

@Component({
  selector: 'll-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:paste)': 'onPaste($event)',
  },
  imports: [
    AssetCardComponent,
    HasRolePipe,
    CommonModule,
    FileDragAndDropDirective,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    TimeDurationPipe,
    FormatFileSizePipe,
    NgOptimizedImage,
    HlmButtonImports,
    HlmIconImports,
    HlmBadgeImports,
    HlmDropdownMenuImports,
    HlmToggleGroupImports,
    HlmTooltipImports,
    HlmBreadcrumbImports,
    HlmProgressImports,
    HlmSpinnerImports,
  ],
  providers: [
    provideIcons({
      lucideLoaderCircle,
      lucideFileUp,
      lucideFolderPlus,
      lucideUpload,
      lucideFileSymlink,
      tablerBrandUnsplash,
      lucideEllipsisVertical,
      lucideCloudDownload,
      lucideUploadCloud,
      lucideRefreshCcwDot,
      lucideLayoutGrid,
      lucideLayoutList,
      lucideFolderRoot,
      lucideDownload,
      lucidePencil,
      lucideFolderInput,
      lucideTrash,
      lucideFolder,
      lucideFile,
      lucideFileImage,
      lucideFileVideoCamera,
      lucideFileMusic,
      lucideFileText,
      lucideFileDigit,
    }),
  ],
})
export class AssetsComponent implements OnInit {
  protected readonly importExportEnabled = FEATURE_FLAGS.importExport;
  private readonly assetService = inject(AssetService);
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  readonly unsplashService = inject(UnsplashService);

  // Input
  spaceId = input.required<string>();

  spaceStore = inject(SpaceStore);

  private destroyRef = inject(DestroyRef);
  /** The folder shown (`SpaceStore.assetFolderId`): paged, sorted and searched on the server (`GET …/assets`). */
  readonly assetList = new FolderList(this.spaceStore.assetFolderId);
  readonly filters = FOLDER_LIST_FILTERS;
  /** The page shown, in both layouts, live. */
  readonly page = pagedResource({
    list: this.assetList.list,
    load: params => this.assetService.findAll(this.spaceId(), params),
    error: 'Assets can not be loaded.',
  });
  readonly dataSource = new TableDataSource<Asset>(this.page.items, this.injector);
  displayedColumns: string[] = ['icon', 'preview', 'name', 'size', 'type', /*'createdAt',*/ 'updatedAt', 'actions'];
  fileUploadQueue = signal<Array<File | AssetFileImport>>([]);
  now = Date.now();

  /** Every folder of the space, from `SpaceStore` (live): the breadcrumbs and the paths are built from it. */
  private readonly folderMap = computed(() => new Map(this.spaceStore.assetFolders().map(it => [it.id, it])));
  /** The folders from the root down to the one shown. */
  readonly trail = computed(() => breadcrumbs(this.folderMap(), this.spaceStore.assetFolderId()));
  /** Where each asset is (`~/Images`), for a list from several folders (`deep`); `undefined` otherwise. */
  readonly location = computed(() => {
    const folders = this.folderMap();
    return this.assetList.deep() ? (asset: Asset) => assetLocation(folders, asset.parentId) : () => undefined;
  });

  /** The folder shown; `undefined`: the root. */
  private get folderId(): string | undefined {
    return this.spaceStore.assetFolderId() ?? undefined;
  }

  // Subscriptions
  private fileUploadQueue$ = new Subject<File | AssetFileImport>();

  // Local Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    this.fileUploadQueue$
      .pipe(
        // Each upload handles its own failure: an error reaching this stream would end it, and every later
        // upload on the page with it.
        concatMap(item =>
          (item instanceof File
            ? this.assetService.createFile(this.spaceId(), this.folderId, item)
            : this.assetService.importFile(this.spaceId(), this.folderId, item)
          ).pipe(
            catchError((error: unknown) => {
              this.notificationService.error(uploadErrorMessage(item instanceof File ? item.name : `${item.name}${item.extension}`, error));
              return EMPTY;
            }),
            finalize(() => this.fileUploadQueue.update(items => items.filter(it => it !== item))),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** Shows the item in the "Uploading … (n)" count and uploads it after the ones before it. */
  private enqueue(item: File | AssetFileImport): void {
    this.fileUploadQueue.update(items => [...items, item]);
    this.fileUploadQueue$.next(item);
  }

  onFileUpload(event: Event): void {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        for (let idx = 0; idx < target.files.length; idx++) {
          const file = target.files[idx];
          this.enqueue(file);
        }
      }
    }
  }

  openUrlPrompt(): void {
    const urlStr = window.prompt('URL');
    // cancelled
    if (urlStr === null) {
      return;
    }
    // empty
    if (urlStr === '') {
      this.notificationService.error('URL is empty.');
      return;
    }
    // value is present
    if (!URL.canParse(urlStr)) {
      this.notificationService.error('Not a valid URL.');
      return;
    }
    const url = new URL(urlStr);
    const name = url.pathname.split('/').pop() || 'unknown';
    const extIdx = name.lastIndexOf('.');
    const asset: AssetFileImport = {
      url: urlStr,
      name: extIdx > 0 ? name.substring(0, extIdx) : name,
      extension: extIdx > 0 ? name.substring(extIdx) : '',
      source: urlStr,
    };
    this.enqueue(asset);
  }

  openUnsplashDialog() {
    this.dialog
      .open<UnsplashPhoto[], UnsplashAssetsSelectDialogContext>(UnsplashAssetsSelectDialogComponent, {
        context: {
          spaceId: this.spaceId(),
          multiple: true,
        },
        contentClass: DIALOG_WIDTH_FULL_SCREEN,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        map(it => it!),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: assets => {
          for (const asset of assets) {
            const afi: AssetFileImport = {
              url: asset.urls.raw,
              name: asset.slug,
              extension: '.jpg',
              alt: asset.alt_description || asset.description || undefined,
              source: asset.urls.raw,
            };
            this.enqueue(afi);
          }
        },
        error: () => {
          this.notificationService.error('Files can not be imported.');
        },
      });
  }

  openAddFolderDialog(): void {
    this.dialog
      .open<AssetFolderCreateForm>(AddFolderDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.createFolder(this.spaceId(), this.folderId, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Folder has been created.');
        },
        error: () => {
          this.notificationService.error('Folder can not be created.');
        },
      });
  }

  openEditDialog(element: Asset): void {
    if (element.kind === AssetKind.FILE) {
      this.openEditFileDialog(element);
    } else if (element.kind === AssetKind.FOLDER) {
      this.openEditFolderDialog(element);
    }
  }

  openEditFolderDialog(element: Asset): void {
    this.dialog
      .open<AssetFolderUpdateForm, EditFolderDialogContext>(EditFolderDialogComponent, {
        context: {
          asset: ObjectUtils.clone(element) as AssetFolder,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.update(this.spaceId(), element.id, { name: it.name })),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Folder has been updated.');
        },
        error: () => {
          this.notificationService.error('Folder can not be updated.');
        },
      });
  }

  openEditFileDialog(element: Asset): void {
    this.dialog
      .open<AssetFileUpdateForm, EditFileDialogContext>(EditFileDialogComponent, {
        context: {
          asset: ObjectUtils.clone(element) as AssetFile,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.update(this.spaceId(), element.id, { name: it.name, alt: it.alt || '' })),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('File has been updated.');
        },
        error: () => {
          this.notificationService.error('File can not be updated.');
        },
      });
  }

  /** Asks first, saying how many contents use it: they keep pointing at it and show it as missing. */
  openDeleteDialog(element: Asset): void {
    let title = '';
    let content = '';
    if (element.kind === AssetKind.FOLDER) {
      title = 'Delete Folder';
      content = `Are you sure about deleting Folder with name: ${element.name}.\n All sub folders and assets will be deleted.`;
    } else if (element.kind === AssetKind.FILE) {
      title = 'Delete Asset';
      content = `Are you sure about deleting Asset with name: ${element.name}.`;
    }
    this.assetService
      .findUsage(this.spaceId(), element.id)
      .pipe(
        // Without the count, the delete is still offered.
        catchError(() => of({ contents: 0 })),
        switchMap(({ contents }) =>
          this.dialog
            .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
              context: {
                title: title,
                content: contents
                  ? `${content}\n It is used by ${contents} ${contents === 1 ? 'content' : 'contents'}, which will show it as missing.`
                  : content,
                variant: 'destructive',
              },
              contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
            })
            .closed$.pipe(take(1)),
        ),
        filter(it => it || false),
        switchMap(() => this.assetService.remove(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Asset '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Asset '${element.name}' can not be deleted.`);
        },
      });
  }

  openMoveDialog(element: Asset) {
    this.dialog
      .open<MoveDialogResult, MoveDialogContext>(MoveDialogComponent, {
        context: {
          spaceId: this.spaceId(),
          asset: element,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.move(this.spaceId(), element.id, it!.parentId)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Asset has been moved.');
        },
        error: (err: unknown) => {
          this.notificationService.error(apiErrorMessage(err, 'Asset can not be moved.'));
        },
      });
  }

  onAssetSelect(element: Asset): void {
    if (element.kind === AssetKind.FILE && this.filePreview(element.type)) {
      this.dialog
        .open<void, ImagePreviewDialogContext>(ImagePreviewDialogComponent, {
          context: {
            spaceId: this.spaceId(),
            asset: element,
          },
          contentClass: DIALOG_WIDTH_IMAGE_PREVIEW,
        })
        .closed$.pipe(take(1))
        .subscribe();
    } else if (element.kind === AssetKind.FOLDER) {
      this.spaceStore.changeAssetFolder(element.id);
    }
  }

  /** A breadcrumb: a folder, or `null` for the root. */
  navigateToFolder(folderId: string | null) {
    if (folderId === this.spaceStore.assetFolderId()) return;
    this.spaceStore.changeAssetFolder(folderId);
  }

  fileIcon(type: string): string {
    return resolveFileIcon(type);
  }

  filePreview(type: string): boolean {
    return isPreviewableFileType(type);
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
        switchMap(it => this.taskService.createAssetImportTask(this.spaceId(), it!.file)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Assets Import Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: () => {
          this.notificationService.error('Assets Import Task can not be created.');
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
        switchMap(it => this.taskService.createAssetExportTask(this.spaceId(), it?.path)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Assets Export Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Assets Export Task can not be created.');
        },
      });
  }

  openRegenerateMetadataDialog(): void {
    this.dialog
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Regenerate Metadata',
          content: `Are you sure about regenerating assets metadata? It is a long running job, it may take from few minutes till one hour.`,
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.taskService.createAssetRegenerateMetadataTask(this.spaceId())),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Assets Regenerate Metadata Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Assets Regenerate Metadata Task can not be created.`);
        },
      });
  }

  onDownload(element: Asset): void {
    if (element.kind !== AssetKind.FILE) return;
    window.open(`/api/v1/spaces/${this.spaceId()}/assets/${element.id}/download`);
  }

  filesUpload(event: File[]) {
    event.forEach(file => {
      this.enqueue(file);
    });
  }

  onPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const files: File[] = [];

    for (let i = 0; i < clipboardData.items.length; i++) {
      console.log(event);
      const item = clipboardData.items[i];
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (!file) continue;
      // Screenshots have no filename — generate one from the mime type and timestamp
      const namedFile = file.name ? file : new File([file], `paste-${Date.now()}.${file.type.split('/')[1] || 'bin'}`, { type: file.type });
      files.push(namedFile);
    }

    if (files.length > 0) {
      event.preventDefault();
      this.filesUpload(files);
    }
  }
}

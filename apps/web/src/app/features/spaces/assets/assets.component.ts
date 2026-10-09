import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ObjectUtils } from '@core/utils/object-utils.service';
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
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog.component';
import { ImagePreviewDialogContext } from '@shared/components/image-preview-dialog/image-preview-dialog.model';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { UnsplashAssetsSelectDialogComponent, UnsplashAssetsSelectDialogContext } from '@shared/components/unsplash-assets-select-dialog';
import { FileDragAndDropDirective } from '@shared/directives/file-drag-and-drop.directive';
import {
  Asset,
  AssetFile,
  AssetFileImport,
  AssetFileUpdateForm,
  AssetFolder,
  AssetFolderCreate,
  AssetFolderUpdateForm,
  AssetKind,
  fileIcon as resolveFileIcon,
  filePreview as isPreviewableFileType,
} from '@shared/models/asset.model';
import { UnsplashPhoto } from '@shared/models/unsplash-plugin.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { AssetService } from '@shared/services/asset.service';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { UnsplashPluginService } from '@shared/services/unsplash-plugin.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { PathItem, SpaceStore } from '@shared/stores/space.store';
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
import { Subject } from 'rxjs';
import { concatMap, filter, map, switchMap, take, tap } from 'rxjs/operators';

import { AddFolderDialogComponent } from './add-folder-dialog/add-folder-dialog.component';
import { AddFolderDialogContext } from './add-folder-dialog/add-folder-dialog.model';
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
    CanUserPerformPipe,
    CommonModule,
    FileDragAndDropDirective,
    LlTableImports,
    LlPaginatorImports,
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
export class AssetsComponent implements OnInit, AfterViewInit {
  private readonly assetService = inject(AssetService);
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  readonly unsplashPluginService = inject(UnsplashPluginService);

  sort = viewChild(TableSort);
  paginator = viewChild.required(Paginator);

  // Input
  spaceId = input.required<string>();

  spaceStore = inject(SpaceStore);

  private destroyRef = inject(DestroyRef);
  private readonly assets = signal<Asset[]>([]);
  readonly dataSource = new TableDataSource<Asset>(this.assets, this.injector);
  displayedColumns: string[] = ['icon', 'preview', 'name', 'size', 'type', /*'createdAt',*/ 'updatedAt', 'actions'];
  fileUploadQueue = signal<Array<File | AssetFileImport>>([]);
  now = Date.now();

  get parentPath(): string {
    const assetPath = this.spaceStore.assetPath();
    if (assetPath.length > 0) {
      return assetPath[assetPath.length - 1].fullSlug;
    }
    return '';
  }

  // Subscriptions
  private fileUploadQueue$ = new Subject<File | AssetFileImport>();

  // Loading
  isLoading = signal(true);
  // Local Settings
  settingsStore = inject(LocalSettingsStore);

  constructor() {
    // `sort` is only present in list layout — re-bind whenever the table (and its
    // llTableSort directive) is created/destroyed by the list/grid toggle.
    effect(() => {
      this.dataSource.sort = this.sort() ?? null;
    });

    toObservable(this.spaceStore.assetPath)
      .pipe(
        filter(it => it !== undefined), // Skip initial data
        switchMap(() => this.assetService.findAll(this.spaceId(), this.parentPath)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: assets => {
          this.assets.set(assets);
          this.isLoading.set(false);
        },
      });
  }

  ngOnInit(): void {
    this.fileUploadQueue$
      .pipe(
        tap(console.log),
        concatMap(it => {
          if (it instanceof File) {
            return this.assetService.createFile(this.spaceId(), this.parentPath, it);
          } else {
            return this.assetService.importFile(this.spaceId(), this.parentPath, it);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.fileUploadQueue.update(files => {
            files.shift();
            return files;
          });
        },
        error: () => {
          this.notificationService.error(`Asset can not be uploaded.`);
        },
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator();
  }

  onFileUpload(event: Event): void {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        for (let idx = 0; idx < target.files.length; idx++) {
          const file = target.files[idx];
          this.fileUploadQueue.update(files => {
            files.push(file);
            return files;
          });
          this.fileUploadQueue$.next(file);
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
    this.fileUploadQueue.update(files => {
      files.push(asset);
      return files;
    });
    this.fileUploadQueue$.next(asset);
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
            this.fileUploadQueue.update(files => {
              files.push(afi);
              return files;
            });
            this.fileUploadQueue$.next(afi);
          }
        },
        error: () => {
          this.notificationService.error('Files can not be imported.');
        },
      });
  }

  openAddFolderDialog(): void {
    this.dialog
      .open<AssetFolderCreate, AddFolderDialogContext>(AddFolderDialogComponent, {
        context: {
          reservedNames: this.assets().map(it => it.name),
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.createFolder(this.spaceId(), this.parentPath, it!)),
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
          reservedNames: this.assets().map(it => it.name),
          asset: ObjectUtils.clone(element) as AssetFolder,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.updateFolder(this.spaceId(), element.id, it)),
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
          reservedNames: this.assets().map(it => it.name),
          asset: ObjectUtils.clone(element) as AssetFile,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.updateFile(this.spaceId(), element.id, it)),
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
        switchMap(() => this.assetService.delete(this.spaceId(), element.id)),
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
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.assetService.move(this.spaceId(), element.id, it!.path)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Asset has been moved.');
        },
        error: () => {
          this.notificationService.error('Asset can not be moved.');
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
      this.isLoading.set(true);
      const assetPath = ObjectUtils.clone(this.spaceStore.assetPath() || []);
      assetPath.push({
        name: element.name,
        fullSlug: element.parentPath ? `${element.parentPath}/${element.id}` : element.id,
      });
      this.spaceStore.changeAssetPath(assetPath);
    }
  }

  navigateToSlug(pathItem: PathItem) {
    this.isLoading.set(true);
    const assetPath = ObjectUtils.clone(this.spaceStore.assetPath() || []);
    const idx = assetPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    assetPath.splice(idx + 1);
    this.spaceStore.changeAssetPath(assetPath);
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
      this.fileUploadQueue.update(files => {
        files.push(file);
        return files;
      });
      this.fileUploadQueue$.next(file);
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

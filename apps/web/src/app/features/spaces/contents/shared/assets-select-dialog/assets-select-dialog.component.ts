import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetService } from '@core/services/asset.service';
import { NotificationService } from '@core/services/notification.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { FOLDER_LIST_FILTERS, FolderList } from '@core/utils/folder-list';
import { assetLocation, breadcrumbs } from '@core/utils/folder-tree';
import { pagedResource } from '@core/utils/paged-resource';
import { uploadErrorMessage } from '@core/utils/upload-error';
import { Asset, AssetKind } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideFile,
  lucideFileDigit,
  lucideFileImage,
  lucideFileMusic,
  lucideFileText,
  lucideFileVideoCamera,
  lucideFolder,
  lucideFolderRoot,
  lucideLayoutGrid,
  lucideLayoutList,
  lucideUpload,
} from '@ng-icons/lucide';
import { AssetCardComponent } from '@shared/components/asset-card/asset-card.component';
import { LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource } from '@shared/components/table/table.imports';
import { fileIcon as resolveFileIcon, filePreview as isPreviewableFileType } from '@shared/models/asset.model';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, Subject } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';

import { AssetsSelectDialogContext, AssetsSelectDialogResult } from './assets-select-dialog.model';

@Component({
  selector: 'll-assets-select-dialog',
  templateUrl: './assets-select-dialog.component.html',
  styleUrls: ['./assets-select-dialog.component.scss'],
  // Three rows: header, a scrolling middle, pinned footer. `minmax(0,1fr)` is what lets the middle
  // row shrink below its content so it scrolls rather than pushing the footer off-screen.
  host: { class: 'grid grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AssetCardComponent,
    CommonModule,
    HlmDialogImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HasRolePipe,
    LlTableImports,
    TimeDurationPipe,
    FormatFileSizePipe,
    NgOptimizedImage,
    HlmBreadcrumbImports,
    HlmIconImports,
    HlmProgressImports,
    HlmSpinnerImports,
    HlmTooltipImports,
    HlmBadgeImports,
    HlmToggleGroupImports,
    HlmButtonImports,
    HlmCheckboxImports,
  ],
  providers: [
    provideIcons({
      lucideFolderRoot,
      lucideLayoutList,
      lucideLayoutGrid,
      lucideUpload,
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
export class AssetsSelectDialogComponent implements OnInit {
  private readonly assetService = inject(AssetService);
  private readonly notificationService = inject(NotificationService);
  readonly fe = inject(FormErrorHandlerService);
  private readonly injector = inject(Injector);
  private readonly dialogRef = inject<BrnDialogRef<AssetsSelectDialogResult>>(BrnDialogRef);

  /** Required: scopes the browser to a space, and `multiple` decides the selection mode. */
  readonly context = injectBrnDialogContext<AssetsSelectDialogContext>();

  /** The folder shown; `null`: the root. */
  readonly folderId = signal<string | null>(null);
  /** The same paged query as the Assets page (folder, search, scope, sort, page), files of the field's type. */
  readonly assetList = new FolderList(this.folderId, 20, { fileType: this.context.fileType });
  readonly filters = FOLDER_LIST_FILTERS;
  /** The page shown, live. */
  readonly page = pagedResource({
    list: this.assetList.list,
    load: params => this.assetService.findPage(this.context.spaceId, params),
    error: 'Assets can not be loaded.',
  });
  readonly dataSource = new TableDataSource<Asset>(this.page.items, this.injector);
  displayedColumns: string[] = ['select', 'icon', 'preview', 'name', 'size', 'type', 'updatedAt'];
  /** Kept by id across pages, folders and searches: files can be picked from several folders. */
  selection = new SelectionModel<Asset>(this.context.multiple, [], undefined, (o1, o2) => o1.id === o2.id);

  fileUploadQueue = signal<File[]>([]);

  private readonly spaceStore = inject(SpaceStore);
  /** Every folder of the space, from `SpaceStore` (live): the breadcrumbs and the paths are built from it. */
  private readonly folderMap = computed(() => new Map(this.spaceStore.assetFolders().map(it => [it.id, it])));
  /** The folders from the root down to the one shown. */
  readonly trail = computed(() => breadcrumbs(this.folderMap(), this.folderId()));
  /** Where each asset is (`~/Images`), for a list from several folders (`deep`); `undefined` otherwise. */
  readonly location = computed(() => {
    const folders = this.folderMap();
    return this.assetList.deep() ? (asset: Asset) => assetLocation(folders, asset.parentId) : () => undefined;
  });

  // Subscriptions
  private fileUploadQueue$ = new Subject<File>();
  private destroyRef = inject(DestroyRef);
  // Local Settings
  settingsStore = inject(LocalSettingsStore);

  ngOnInit(): void {
    this.fileUploadQueue$
      .pipe(
        // Each upload handles its own failure: an error reaching this stream would end it, and every later
        // upload on the page with it.
        concatMap(item =>
          this.assetService.createFile(this.context.spaceId, this.folderId() ?? undefined, item).pipe(
            catchError((error: unknown) => {
              this.notificationService.error(uploadErrorMessage(item.name, error));
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
  private enqueue(item: File): void {
    this.fileUploadQueue.update(items => [...items, item]);
    this.fileUploadQueue$.next(item);
  }

  /** A breadcrumb: a folder, or `null` for the root. */
  navigateToFolder(folderId: string | null) {
    this.folderId.set(folderId);
  }

  onAssetSelect(element: Asset): void {
    if (element.kind === AssetKind.FILE) {
      this.selection.toggle(element);
      return;
    } else if (element.kind === AssetKind.FOLDER) {
      this.navigateToFolder(element.id);
    }
  }

  fileIcon(type: string): string {
    return resolveFileIcon(type);
  }

  filePreview(type: string): boolean {
    return isPreviewableFileType(type);
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

  save(): void {
    this.dialogRef.close(this.selection.selected as AssetsSelectDialogResult);
  }
}

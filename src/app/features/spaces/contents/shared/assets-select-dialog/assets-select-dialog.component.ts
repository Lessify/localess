import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
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
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { Asset, AssetKind } from '@shared/models/asset.model';
import { AssetFileType, assetFileTypeDescriptions } from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { AssetService } from '@shared/services/asset.service';
import { NotificationService } from '@shared/services/notification.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { PathItem } from '@shared/stores/space.store';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { BehaviorSubject, Subject } from 'rxjs';
import { concatMap, switchMap, tap } from 'rxjs/operators';

import { AssetsSelectDialogModel } from './assets-select-dialog.model';

@Component({
  selector: 'll-assets-select-dialog',
  templateUrl: './assets-select-dialog.component.html',
  styleUrls: ['./assets-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    LlPaginatorImports,
    CanUserPerformPipe,
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
    HlmCardImports,
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
export class AssetsSelectDialogComponent implements OnInit, AfterViewInit {
  private readonly assetService = inject(AssetService);
  private readonly notificationService = inject(NotificationService);
  readonly fe = inject(FormErrorHandlerService);
  private readonly injector = inject(Injector);
  data = inject<AssetsSelectDialogModel>(MAT_DIALOG_DATA);

  sort = viewChild(TableSort);
  paginator = viewChild.required(Paginator);

  private readonly assets = signal<Asset[]>([]);
  readonly dataSource = new TableDataSource<Asset>(this.assets, this.injector);
  displayedColumns: string[] = ['select', 'icon', 'preview', 'name', 'size', 'type', 'updatedAt'];
  selection = new SelectionModel<Asset>(this.data.multiple, [], undefined, (o1, o2) => o1.id === o2.id);
  assetPath: PathItem[] = [];

  fileUploadQueue = signal<File[]>([]);

  get parentPath(): string {
    if (this.assetPath && this.assetPath.length > 0) {
      return this.assetPath[this.assetPath.length - 1].fullSlug;
    }
    return '';
  }

  // Subscriptions
  path$ = new BehaviorSubject<PathItem[]>([
    {
      name: 'Root',
      fullSlug: '',
    },
  ]);

  // Subscriptions
  private fileUploadQueue$ = new Subject<File>();
  private destroyRef = inject(DestroyRef);
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

    this.path$
      .asObservable()
      .pipe(
        switchMap(path => {
          this.assetPath = path;
          return this.assetService.findAll(this.data.spaceId, this.parentPath, this.data.fileType);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: assets => {
          this.assets.set(assets);
          this.isLoading.set(false);
        },
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator();
  }

  ngOnInit(): void {
    this.fileUploadQueue$
      .pipe(
        tap(console.log),
        concatMap(it => this.assetService.createFile(this.data.spaceId, this.parentPath, it)),
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

  navigateToSlug(pathItem: PathItem) {
    this.isLoading.set(true);
    const assetPath = ObjectUtils.clone(this.assetPath);
    const idx = assetPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    assetPath.splice(idx + 1);
    this.path$.next(assetPath);
  }

  onAssetSelect(element: Asset): void {
    if (element.kind === AssetKind.FILE) {
      this.selection.toggle(element);
      return;
    } else if (element.kind === AssetKind.FOLDER) {
      this.isLoading.set(true);
      const assetPath = ObjectUtils.clone(this.assetPath);
      assetPath.push({
        name: element.name,
        fullSlug: element.parentPath ? `${element.parentPath}/${element.id}` : element.id,
      });
      this.path$.next(assetPath);
    }
  }

  fileIcon(type: string): string {
    if (type.startsWith('audio/')) return assetFileTypeDescriptions[AssetFileType.AUDIO].icon;
    if (type.startsWith('text/')) return assetFileTypeDescriptions[AssetFileType.TEXT].icon;
    if (type.startsWith('image/')) return assetFileTypeDescriptions[AssetFileType.IMAGE].icon;
    if (type.startsWith('video/')) return assetFileTypeDescriptions[AssetFileType.VIDEO].icon;
    if (type.startsWith('application/')) return assetFileTypeDescriptions[AssetFileType.APPLICATION].icon;
    return assetFileTypeDescriptions[AssetFileType.ANY].icon;
  }

  filePreview(type: string): boolean {
    return type.startsWith('image/') || type.startsWith('video/');
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
}

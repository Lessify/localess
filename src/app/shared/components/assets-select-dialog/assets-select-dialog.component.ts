import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { BreadcrumbComponent, BreadcrumbItemComponent } from '@shared/components/breadcrumb';
import { AnimateDirective } from '@shared/directives/animate.directive';
import { Asset, AssetKind } from '@shared/models/asset.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { TimeDurationPipe } from '@shared/pipes/time-duration.pipe';
import { AssetService } from '@shared/services/asset.service';
import { NotificationService } from '@shared/services/notification.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { PathItem } from '@shared/stores/space.store';
import { BehaviorSubject, Subject } from 'rxjs';
import { concatMap, switchMap, tap } from 'rxjs/operators';
import { AssetsSelectDialogModel } from './assets-select-dialog.model';

@Component({
  selector: 'll-assets-select-dialog',
  standalone: true,
  templateUrl: './assets-select-dialog.component.html',
  styleUrls: ['./assets-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatTooltipModule,
    BreadcrumbComponent,
    BreadcrumbItemComponent,
    MatButtonToggleModule,
    MatIconModule,
    CanUserPerformPipe,
    MatProgressBarModule,
    MatTableModule,
    TimeDurationPipe,
    FormatFileSizePipe,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatSortModule,
    MatBadgeModule,
    NgOptimizedImage,
    AnimateDirective,
    MatCardModule,
  ],
})
export class AssetsSelectDialogComponent implements OnInit {
  sort = viewChild(MatSort);
  paginator = viewChild.required(MatPaginator);

  assets: Asset[] = [];
  dataSource: MatTableDataSource<Asset> = new MatTableDataSource<Asset>([]);
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

  constructor(
    private readonly assetService: AssetService,
    private readonly notificationService: NotificationService,
    readonly fe: FormErrorHandlerService,
    private readonly cd: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: AssetsSelectDialogModel,
  ) {
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
          this.assets = assets;
          this.dataSource = new MatTableDataSource<Asset>(assets);
          this.dataSource.sort = this.sort() || null;
          this.dataSource.paginator = this.paginator();
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
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
    if (type.startsWith('audio/')) return 'audio_file';
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('font/')) return 'font_download';
    if (type.startsWith('video/')) return 'video_file';
    return 'file_present';
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

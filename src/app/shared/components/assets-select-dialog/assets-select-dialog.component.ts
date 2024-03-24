import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AssetsSelectDialogModel } from './assets-select-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { SelectionModel } from '@angular/cdk/collections';
import { Asset, AssetKind } from '@shared/models/asset.model';
import { switchMap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { AssetService } from '@shared/services/asset.service';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { SpaceService } from '@shared/services/space.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PathItem } from '@shared/store/space.store';

@Component({
  selector: 'll-assets-select-dialog',
  templateUrl: './assets-select-dialog.component.html',
  styleUrls: ['./assets-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsSelectDialogComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  assets: Asset[] = [];
  dataSource: MatTableDataSource<Asset> = new MatTableDataSource<Asset>([]);
  displayedColumns: string[] = ['select', 'icon', 'preview', 'name', 'size', 'type', 'updatedAt'];
  selection = new SelectionModel<Asset>(this.data.multiple, []);
  assetPath: PathItem[] = [];

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

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly assetService: AssetService,
    private readonly spaceService: SpaceService,
    readonly fe: FormErrorHandlerService,
    private readonly cd: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: AssetsSelectDialogModel
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.path$
      .asObservable()
      .pipe(
        switchMap(path => {
          this.assetPath = path;
          return this.assetService.findAll(this.data.spaceId, this.parentPath, this.data.fileType);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: assets => {
          this.assets = assets;

          this.dataSource = new MatTableDataSource<Asset>(assets);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.cd.markForCheck();
        },
      });
  }

  navigateToSlug(pathItem: PathItem) {
    const assetPath = ObjectUtils.clone(this.assetPath);
    const idx = assetPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    assetPath.splice(idx + 1);
    this.path$.next(assetPath);
  }

  onRowSelect(element: Asset): void {
    if (element.kind === AssetKind.FILE) {
      this.selection.toggle(element);
      return;
    }

    if (element.kind === AssetKind.FOLDER) {
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
    return type.startsWith('image/');
  }

  ngOnDestroy(): void {
    this.path$.complete();
  }
}

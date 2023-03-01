import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {AssetSelectDialogModel} from './asset-select-dialog.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {PathItem} from '@core/state/space/space.model';
import {ObjectUtils} from '@core/utils/object-utils.service';
import {SelectionModel} from '@angular/cdk/collections';
import {Asset, AssetKind} from '@shared/models/asset.model';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {MatTableDataSource} from '@angular/material/table';
import {AssetService} from '@shared/services/asset.service';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {selectSpace} from '@core/state/space/space.selector';
import {SpaceService} from '@shared/services/space.service';

@Component({
  selector: 'll-asset-select-dialog',
  templateUrl: './asset-select-dialog.component.html',
  styleUrls: ['./asset-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssetSelectDialogComponent implements OnInit, OnDestroy {

  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  assets: Asset[] = [];
  dataSource: MatTableDataSource<Asset> = new MatTableDataSource<Asset>([]);
  displayedColumns: string[] = ['select', 'icon', 'name', 'size', 'type', 'updatedAt'];
  selection = new SelectionModel<Asset>(this.data.multiple, []);
  assetPath: PathItem[] = [{
    name: 'Root',
    fullSlug: ''
  }];

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly assetService: AssetService,
    private readonly spaceService: SpaceService,
    readonly fe: FormErrorHandlerService,
    private readonly cd: ChangeDetectorRef,
    private readonly store: Store<AppState>,
    @Inject(MAT_DIALOG_DATA)
    public data: AssetSelectDialogModel
  ) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          this.assetService.findAll(it.id, this.parentPath)
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (assets) => {
          this.assets = assets;

          this.dataSource = new MatTableDataSource<Asset>(assets);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.selection.clear()
          this.cd.markForCheck();
        }
      });
  }

  get parentPath(): string {
    if (this.assetPath && this.assetPath.length > 0) {
      return this.assetPath[this.assetPath.length - 1].fullSlug;
    }
    return '';
  }

  navigateToSlug(pathItem: PathItem) {
    this.selection.clear()
    const assetPath = ObjectUtils.clone(this.assetPath)
    const idx = assetPath.findIndex((it) => it.fullSlug == pathItem.fullSlug);
    assetPath.splice(idx + 1);
  }

  onRowSelect(element: Asset): void {
    if (element.kind === AssetKind.FILE) {
      this.selection.toggle(element)
      return;
    }

    if (element.kind === AssetKind.FOLDER) {
      this.selection.clear()
      const assetPath = ObjectUtils.clone(this.assetPath)
      assetPath.push({
        name: element.name,
        fullSlug: element.parentPath ? `${element.parentPath}/${element.id}` : element.id
      })
    }
  }

  fileIcon(type: string): string {
    if (type.startsWith('audio/')) return 'audio_file'
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('font/')) return 'font_download'
    if (type.startsWith('video/')) return 'video_file'
    return 'file_present'
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

}

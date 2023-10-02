import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { selectSpace } from '@core/state/space/space.selector';
import { NotificationService } from '@shared/services/notification.service';
import { combineLatest, Subject } from 'rxjs';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { SelectionModel } from '@angular/cdk/collections';
import { PathItem } from '@core/state/space/space.model';
import { actionSpaceAssetPathChange } from '@core/state/space/space.actions';
import { AssetService } from '@shared/services/asset.service';
import { Asset, AssetFile, AssetFileUpdate, AssetFolderCreate, AssetFolderUpdate, AssetKind } from '@shared/models/asset.model';
import { AddFolderDialogModel } from './add-folder-dialog/add-folder-dialog.model';
import { AddFolderDialogComponent } from './add-folder-dialog/add-folder-dialog.component';
import { EditFolderDialogComponent } from './edit-folder-dialog/edit-folder-dialog.component';
import { EditFolderDialogModel } from './edit-folder-dialog/edit-folder-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogReturn } from './import-dialog/import-dialog.model';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogModel, ExportDialogReturn } from './export-dialog/export-dialog.model';
import { TaskService } from '@shared/services/task.service';
import { EditFileDialogComponent } from './edit-file-dialog/edit-file-dialog.component';
import { EditFileDialogModel } from './edit-file-dialog/edit-file-dialog.model';

@Component({
  selector: 'll-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  selectedSpace?: Space;
  dataSource: MatTableDataSource<Asset> = new MatTableDataSource<Asset>([]);
  displayedColumns: string[] = [/*'select',*/ 'icon', 'preview', 'name', 'size', 'type', 'createdAt', 'updatedAt', 'actions'];
  selection = new SelectionModel<Asset>(true, []);
  assets: Asset[] = [];
  assetPath: PathItem[] = [];

  get parentPath(): string {
    if (this.assetPath && this.assetPath.length > 0) {
      return this.assetPath[this.assetPath.length - 1].fullSlug;
    }
    return '';
  }

  // Subscriptions
  private destroy$ = new Subject();

  // Loading
  isLoading = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assetService: AssetService,
    private readonly spaceService: SpaceService,
    private readonly taskService: TaskService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store
      .select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        tap(it => {
          if (it.assetPath && it.assetPath.length > 0) {
            this.assetPath = it.assetPath;
          } else {
            this.assetPath = [
              {
                name: 'Root',
                fullSlug: '',
              },
            ];
          }
        }),
        switchMap(it => combineLatest([this.spaceService.findById(it.id), this.assetService.findAll(it.id, this.parentPath)])),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ([space, assets]) => {
          this.selectedSpace = space;
          this.assets = assets;

          this.dataSource = new MatTableDataSource<Asset>(assets);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.selection.clear();
          this.cd.markForCheck();
        },
      });
  }

  onFileUpload(event: Event): void {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        for (let idx = 0; idx < target.files.length; idx++) {
          const file = target.files[idx];
          this.assetService.createFile(this.selectedSpace!.id, this.parentPath, file).subscribe({
            next: () => {
              this.notificationService.success(`Asset '${file.name}' has been uploaded.`);
            },
            error: () => {
              this.notificationService.error(`Asset '${file.name}' can not be uploaded.`);
            },
          });
        }
      }
    }
  }

  openAddFolderDialog(): void {
    this.dialog
      .open<AddFolderDialogComponent, AddFolderDialogModel, AssetFolderCreate>(AddFolderDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.assets.map(it => it.name),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.assetService.createFolder(this.selectedSpace!.id, this.parentPath, it!))
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

  openEditDialog(event: Event, element: Asset): void {
    if (element.kind === AssetKind.FILE) {
      this.openEditFileDialog(event, element);
    } else if (element.kind === AssetKind.FOLDER) {
      this.openEditFolderDialog(event, element);
    }
  }

  openEditFolderDialog(event: Event, element: Asset): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<EditFolderDialogComponent, EditFolderDialogModel, AssetFolderUpdate>(EditFolderDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.assets.map(it => it.name),
          asset: ObjectUtils.clone(element),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.assetService.updateFolder(this.selectedSpace!.id, element.id, it!))
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success('Folder has been updated.');
        },
        error: () => {
          this.notificationService.error('Folder can not be updated.');
        },
      });
  }

  openEditFileDialog(event: Event, element: Asset): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<EditFileDialogComponent, EditFileDialogModel, AssetFileUpdate>(EditFileDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.assets.map(it => it.name),
          asset: ObjectUtils.clone(element),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.assetService.updateFile(this.selectedSpace!.id, element.id, it!))
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success('File has been updated.');
        },
        error: () => {
          this.notificationService.error('File can not be updated.');
        },
      });
  }

  openDeleteDialog(event: Event, element: Asset): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Asset',
          content: `Are you sure about deleting Asset with name: ${element.name}.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.assetService.delete(this.selectedSpace!.id, element.id))
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success(`Asset '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Asset '${element.name}' can not be deleted.`);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined);
    this.destroy$.complete();
  }

  // TABLE
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  onRowSelect(element: Asset): void {
    // if (element.kind === AssetKind.FILE) {
    //   element.publishedAt
    //   if (this.schemasMap.has(element.schema)) {
    //     this.router.navigate(['features', 'contents', element.id]);
    //   } else {
    //     this.notificationService.warn(`Content Schema can not be found.`);
    //   }
    //   return;
    // }

    this.isLoading = true;
    if (element.kind === AssetKind.FOLDER) {
      this.selection.clear();
      const assetPath = ObjectUtils.clone(this.assetPath);
      assetPath.push({
        name: element.name,
        fullSlug: element.parentPath ? `${element.parentPath}/${element.id}` : element.id,
      });
      this.store.dispatch(actionSpaceAssetPathChange({ assetPath }));
    }
  }

  navigateToSlug(pathItem: PathItem) {
    this.isLoading = true;
    this.selection.clear();
    const assetPath = ObjectUtils.clone(this.assetPath);
    const idx = assetPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    assetPath.splice(idx + 1);
    this.store.dispatch(actionSpaceAssetPathChange({ assetPath }));
  }

  fileIcon(type: string): string {
    if (type.startsWith('audio/')) return 'audio_file';
    if (type.startsWith('text/')) return 'description';
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('font/')) return 'font_download';
    if (type.startsWith('video/')) return 'video_file';
    return 'file_present';
  }

  filePreview(type: string): boolean {
    return type.startsWith('image/');
  }

  openImportDialog() {
    this.dialog
      .open<ImportDialogComponent, void, ImportDialogReturn>(ImportDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        tap(console.log),
        switchMap(it => this.taskService.createAssetImportTask(this.selectedSpace!.id, it!.file))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Assets Import Task has been created.', [{ label: 'To Tasks', link: '/features/tasks' }]);
        },
        error: () => {
          this.notificationService.error('Assets Import Task can not be created.');
        },
      });
  }

  openExportDialog() {
    this.dialog
      .open<ExportDialogComponent, ExportDialogModel, ExportDialogReturn>(ExportDialogComponent, {
        width: '500px',
        data: {
          spaceId: this.selectedSpace!.id,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createAssetExportTask(this.selectedSpace!.id, it?.path))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Assets Export Task has been created.', [{ label: 'To Tasks', link: '/features/tasks' }]);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Assets Export Task can not be created.');
        },
      });
  }

  onDownload(event: Event, element: AssetFile): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(`/api/v1/spaces/${this.selectedSpace!.id}/assets/${element.id}?download`);
  }

  filesDragAndDrop(event: File[]) {
    for (let idx = 0; idx < event.length; idx++) {
      const file = event[idx];
      this.assetService.createFile(this.selectedSpace!.id, this.parentPath, file).subscribe({
        next: () => {
          this.notificationService.success(`Asset '${file.name}' has been uploaded.`);
        },
        error: () => {
          this.notificationService.error(`Asset '${file.name}' can not be uploaded.`);
        },
      });
    }
  }
}

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { concatMap, filter, switchMap, tap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { NotificationService } from '@shared/services/notification.service';
import { Subject } from 'rxjs';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { SelectionModel } from '@angular/cdk/collections';
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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { PathItem, SpaceStore } from '@shared/store/space.store';

@Component({
  selector: 'll-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsComponent implements OnInit {
  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  // Input
  spaceId = input.required<string>();

  spaceStore = inject(SpaceStore);

  private destroyRef = inject(DestroyRef);
  dataSource: MatTableDataSource<Asset> = new MatTableDataSource<Asset>([]);
  displayedColumns: string[] = [/*'select',*/ 'icon', 'preview', 'name', 'size', 'type', 'createdAt', 'updatedAt', 'actions'];
  selection = new SelectionModel<Asset>(true, []);
  assets: Asset[] = [];
  fileUploadQueue: File[] = [];
  now = Date.now();

  get parentPath(): string {
    const assetPath = this.spaceStore.assetPath();
    if (assetPath.length > 0) {
      return assetPath[assetPath.length - 1].fullSlug;
    }
    return '';
  }

  // Subscriptions
  private fileUploadQueue$ = new Subject<File>();

  // Loading
  isLoading = signal(true);

  constructor(
    private readonly assetService: AssetService,
    private readonly taskService: TaskService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService
  ) {
    toObservable(this.spaceStore.assetPath)
      .pipe(
        filter(it => it !== undefined), // Skip initial data
        switchMap(() => this.assetService.findAll(this.spaceId(), this.parentPath)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: assets => {
          this.assets = assets;
          this.dataSource = new MatTableDataSource<Asset>(assets);
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading.set(false);
          this.selection.clear();
          this.cd.markForCheck();
        },
      });
  }

  ngOnInit(): void {
    this.fileUploadQueue$
      .pipe(
        tap(console.log),
        concatMap(it => this.assetService.createFile(this.spaceId(), this.parentPath, it)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.fileUploadQueue.shift();
        },
        error: () => {
          this.notificationService.error(`Asset can not be uploaded.`);
        },
      });
  }

  onFileUpload(event: Event): void {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        for (let idx = 0; idx < target.files.length; idx++) {
          const file = target.files[idx];
          this.fileUploadQueue.push(file);
          this.fileUploadQueue$.next(file);
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
        switchMap(it => this.assetService.createFolder(this.spaceId(), this.parentPath, it!))
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
        switchMap(it => this.assetService.updateFolder(this.spaceId(), element.id, it!))
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
        switchMap(it => this.assetService.updateFile(this.spaceId(), element.id, it!))
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
    console.log(element);
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
        switchMap(() => this.assetService.delete(this.spaceId(), element.id))
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

    this.isLoading.set(true);
    if (element.kind === AssetKind.FOLDER) {
      this.selection.clear();
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
    this.selection.clear();
    const assetPath = ObjectUtils.clone(this.spaceStore.assetPath() || []);
    const idx = assetPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    assetPath.splice(idx + 1);
    this.spaceStore.changeAssetPath(assetPath);
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
        switchMap(it => this.taskService.createAssetImportTask(this.spaceId(), it!.file))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Assets Import Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
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
          spaceId: this.spaceId(),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createAssetExportTask(this.spaceId(), it?.path))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Assets Export Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
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
    window.open(`/api/v1/spaces/${this.spaceId()}/assets/${element.id}?download`);
  }

  filesDragAndDrop(event: File[]) {
    event.forEach(file => {
      this.fileUploadQueue.push(file);
      this.fileUploadQueue$.next(file);
    });
  }
}

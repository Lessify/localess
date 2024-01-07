import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap, tap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { SpaceService } from '@shared/services/space.service';
import { selectSpace } from '@core/state/space/space.selector';
import { NotificationService } from '@shared/services/notification.service';
import { Schema, SchemaType } from '@shared/models/schema.model';
import { SchemaService } from '@shared/services/schema.service';
import { combineLatest } from 'rxjs';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {
  Content,
  ContentDocument,
  ContentDocumentCreate,
  ContentFolderCreate,
  ContentKind,
  ContentUpdate,
} from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { SelectionModel } from '@angular/cdk/collections';
import { PathItem } from '@core/state/space/space.model';
import { actionSpaceContentPathChange } from '@core/state/space/space.actions';
import { AddDocumentDialogComponent } from './add-document-dialog/add-document-dialog.component';
import { AddDocumentDialogModel } from './add-document-dialog/add-document-dialog.model';
import { AddFolderDialogComponent } from './add-folder-dialog/add-folder-dialog.component';
import { AddFolderDialogModel } from './add-folder-dialog/add-folder-dialog.model';
import { EditDialogComponent } from './edit-dialog/edit-dialog.component';
import { EditDialogModel } from './edit-dialog/edit-dialog.model';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogModel, ExportDialogReturn } from './export-dialog/export-dialog.model';
import { TaskService } from '@shared/services/task.service';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogReturn } from './import-dialog/import-dialog.model';
import { TokenService } from '@shared/services/token.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-contents',
  templateUrl: './contents.component.html',
  styleUrls: ['./contents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentsComponent implements OnInit {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  @Input({ required: true })
  spaceId!: string;

  isLoading = true;
  dataSource: MatTableDataSource<Content> = new MatTableDataSource<Content>([]);
  displayedColumns: string[] = [/*'select',*/ 'status', 'name', 'slug', 'schema', 'publishedAt', 'createdAt', 'updatedAt', 'actions'];
  selection = new SelectionModel<Content>(true, []);

  schemas: Schema[] = [];
  schemasMap: Map<string, Schema> = new Map<string, Schema>();
  contents: Content[] = [];
  contentPath: PathItem[] = [];

  get parentPath(): string {
    if (this.contentPath && this.contentPath.length > 0) {
      return this.contentPath[this.contentPath.length - 1].fullSlug;
    }
    return '';
  }

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schemasService: SchemaService,
    private readonly contentService: ContentService,
    private readonly tokenService: TokenService,
    private readonly spaceService: SpaceService,
    private readonly taskService: TaskService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.loadData(this.spaceId);
  }

  loadData(spaceId: string): void {
    this.store
      .select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        tap(it => {
          if (it.contentPath && it.contentPath.length > 0) {
            this.contentPath = it.contentPath;
          } else {
            this.contentPath = [
              {
                name: 'Root',
                fullSlug: '',
              },
            ];
          }
        }),
        switchMap(() =>
          combineLatest([this.schemasService.findAll(spaceId, SchemaType.ROOT), this.contentService.findAll(spaceId, this.parentPath)])
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ([schemas, contents]) => {
          this.schemas = schemas;
          this.schemasMap = schemas.reduce((acc, value) => acc.set(value.id, value), new Map<string, Schema>());
          this.contents = contents;
          this.dataSource = new MatTableDataSource<Content>(contents);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.selection.clear();
          this.cd.markForCheck();
        },
      });
  }

  openAddDocumentDialog(): void {
    this.dialog
      .open<AddDocumentDialogComponent, AddDocumentDialogModel, ContentDocumentCreate>(AddDocumentDialogComponent, {
        width: '500px',
        data: {
          schemas: this.schemas,
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.contentService.createDocument(this.spaceId, this.parentPath, it!))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Document has been created.');
        },
        error: () => {
          this.notificationService.error('Document can not be created.');
        },
      });
  }

  openAddFolderDialog(): void {
    this.dialog
      .open<AddFolderDialogComponent, AddFolderDialogModel, ContentFolderCreate>(AddFolderDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.contentService.createFolder(this.spaceId, this.parentPath, it!))
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

  openEditDialog(event: Event, element: Content): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<EditDialogComponent, EditDialogModel, ContentUpdate>(EditDialogComponent, {
        width: '500px',
        data: {
          content: ObjectUtils.clone(element),
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.contentService.update(this.spaceId, element.id, this.parentPath, it!))
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success('Content has been updated.');
        },
        error: () => {
          this.notificationService.error('Content can not be updated.');
        },
      });
  }

  openDeleteDialog(event: Event, element: Content): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Content',
          content: `Are you sure about deleting Content with name: ${element.name}.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.contentService.delete(this.spaceId, element))
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success(`Content '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Content '${element.name}' can not be deleted.`);
        },
      });
  }

  openCloneDialog(event: Event, element: ContentDocument): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Clone Content',
          content: `Are you sure about clone Content with name: ${element.name}.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.contentService.cloneDocument(this.spaceId, element))
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success(`Content '${element.name}' has been cloned.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Content '${element.name}' can not be cloned.`);
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

  onRowSelect(element: Content): void {
    this.isLoading = true;
    if (element.kind === ContentKind.DOCUMENT) {
      element.publishedAt;
      if (this.schemasMap.has(element.schema)) {
        this.router.navigate(['features', 'spaces', this.spaceId, 'contents', element.id]);
      } else {
        this.notificationService.warn(`Content Schema can not be found.`);
      }
      return;
    }

    if (element.kind === ContentKind.FOLDER) {
      this.selection.clear();
      const contentPath = ObjectUtils.clone(this.contentPath);
      contentPath.push({
        name: element.name,
        fullSlug: element.fullSlug,
      });
      this.store.dispatch(actionSpaceContentPathChange({ contentPath }));
    }
  }

  navigateToSlug(pathItem: PathItem) {
    this.isLoading = true;
    this.selection.clear();
    const contentPath = ObjectUtils.clone(this.contentPath);
    const idx = contentPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    contentPath.splice(idx + 1);
    this.store.dispatch(actionSpaceContentPathChange({ contentPath }));
  }

  openLinksInNewTab() {
    this.tokenService.findFirst(this.spaceId).subscribe({
      next: tokens => {
        if (tokens.length === 1) {
          const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId}/links`);
          url.searchParams.set('token', tokens[0].id);
          window.open(url, '_blank');
        } else {
          this.notificationService.warn('Please create Access Token in your Space Settings');
        }
      },
    });
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
        switchMap(it => this.taskService.createContentImportTask(this.spaceId, it!.file))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content Import Task has been created.', [{ label: 'To Tasks', link: '/features/tasks' }]);
        },
        error: () => {
          this.notificationService.error('Content Import Task can not be created.');
        },
      });
  }

  openExportDialog() {
    this.dialog
      .open<ExportDialogComponent, ExportDialogModel, ExportDialogReturn>(ExportDialogComponent, {
        width: '500px',
        data: {
          spaceId: this.spaceId,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createContentExportTask(this.spaceId, it?.path))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content Export Task has been created.', [{ label: 'To Tasks', link: '/features/tasks' }]);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Content Export Task can not be created.');
        },
      });
  }
}

import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { BreadcrumbComponent, BreadcrumbItemComponent } from '@shared/components/breadcrumb';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { StatusComponent } from '@shared/components/status';
import {
  Content,
  ContentDocument,
  ContentDocumentCreate,
  ContentFolderCreate,
  ContentKind,
  ContentUpdate,
  sortContent,
} from '@shared/models/content.model';
import { Schema, SchemaType, sortSchema } from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { PathItem, SpaceStore } from '@shared/stores/space.store';
import { combineLatest } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { AddDocumentDialogComponent, AddDocumentDialogModel } from './add-document-dialog';
import { AddFolderDialogComponent, AddFolderDialogModel } from './add-folder-dialog';
import { EditDialogComponent, EditDialogModel } from './edit-dialog';
import { ExportDialogComponent, ExportDialogModel, ExportDialogReturn } from './export-dialog';
import { ImportDialogComponent, ImportDialogReturn } from './import-dialog';
import { MoveDialogComponent, MoveDialogModel, MoveDialogReturn } from './move-dialog';

@Component({
  selector: 'll-contents',
  templateUrl: './contents.component.html',
  styleUrls: ['./contents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatTooltipModule,
    CanUserPerformPipe,
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressBarModule,
    BreadcrumbComponent,
    BreadcrumbItemComponent,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    StatusComponent,
    MatPaginatorModule,
  ],
})
export class ContentsComponent {
  private readonly router = inject(Router);
  private readonly schemasService = inject(SchemaService);
  private readonly contentService = inject(ContentService);
  private readonly tokenService = inject(TokenService);
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  // Input
  spaceId = input.required<string>();

  spaceStore = inject(SpaceStore);

  isLoading = signal(true);
  dataSource: MatTableDataSource<Content> = new MatTableDataSource<Content>([]);
  displayedColumns: string[] = [/*'select',*/ 'status', 'name', 'slug', 'schema', /*'publishedAt', 'createdAt',*/ 'updatedAt', 'actions'];
  selection = new SelectionModel<Content>(true, [], undefined, (o1, o2) => o1.id === o2.id);

  schemas: Schema[] = [];
  schemasMapById: Map<string, Schema> = new Map<string, Schema>();
  contents: Content[] = [];

  get parentPath(): string {
    const contentPath = this.spaceStore.contentPath();
    if (contentPath.length > 0) {
      return contentPath[contentPath.length - 1].fullSlug;
    }
    return '';
  }

  availableToken?: string = undefined;

  private destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.spaceStore.contentPath)
      .pipe(
        filter(it => it !== undefined), // Skip initial data
        switchMap(() =>
          combineLatest([
            this.schemasService.findAll(this.spaceId(), SchemaType.ROOT),
            this.contentService.findAll(this.spaceId(), this.parentPath),
          ]),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ([schemas, contents]) => {
          this.schemas = schemas.sort(sortSchema);
          this.schemasMapById = new Map(this.schemas.map(it => [it.id, it]));
          this.contents = contents.sort(sortContent);
          this.dataSource = new MatTableDataSource<Content>(this.contents);
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading.set(false);
          this.selection.clear();
          this.cd.markForCheck();
        },
      });
  }

  openAddDocumentDialog(): void {
    this.dialog
      .open<AddDocumentDialogComponent, AddDocumentDialogModel, ContentDocumentCreate>(AddDocumentDialogComponent, {
        panelClass: 'sm',
        data: {
          schemas: this.schemas,
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.contentService.createDocument(this.spaceId(), this.parentPath, it!)),
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
        panelClass: 'sm',
        data: {
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.contentService.createFolder(this.spaceId(), this.parentPath, it!)),
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
        panelClass: 'sm',
        data: {
          content: ObjectUtils.clone(element),
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.contentService.update(this.spaceId(), element.id, this.parentPath, it!)),
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
    let title = '';
    let content = '';
    let messageSuccess = '';
    let messageError = '';
    if (element.kind === ContentKind.FOLDER) {
      title = 'Delete Folder';
      content = `Are you sure about deleting Folder with name: ${element.name}.\n All sub folders and documents will be deleted.`;
      messageSuccess = `Folder '${element.name}' has been deleted.`;
      messageError = `Folder '${element.name}' can not be deleted.`;
    } else if (element.kind === ContentKind.DOCUMENT) {
      title = 'Delete Document';
      content = `Are you sure about deleting Document with name: ${element.name}.`;
      messageSuccess = `Document '${element.name}' has been deleted.`;
      messageError = `Document '${element.name}' can not be deleted.`;
    }
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: title,
          content: content,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.contentService.delete(this.spaceId(), element)),
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success(messageSuccess);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(messageError);
        },
      });
  }

  openMoveDialog(event: Event, element: Content) {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<MoveDialogComponent, MoveDialogModel, MoveDialogReturn>(MoveDialogComponent, {
        panelClass: 'sm',
        data: {
          spaceId: this.spaceId(),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.contentService.move(this.spaceId(), element.id, it!.path, element.slug)),
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success('Document has been moved.');
        },
        error: () => {
          this.notificationService.error('Document can not be moved.');
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
          title: 'Clone Document',
          content: `Are you sure about clone the Document with name: ${element.name}.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.contentService.cloneDocument(this.spaceId(), element)),
      )
      .subscribe({
        next: () => {
          this.selection.clear();
          this.cd.markForCheck();
          this.notificationService.success(`Document '${element.name}' has been cloned.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Document '${element.name}' can not be cloned.`);
        },
      });
  }

  openPublishDialog(event: Event, element: Content): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    let title = '';
    let content = '';
    let messageSuccess = '';
    let messageError = '';
    if (element.kind === ContentKind.FOLDER) {
      title = 'Publish Folder';
      content = `Are you sure about publishing the Folder with the name: ${element.name}.\n All sub folders and documents will be published.`;
      messageSuccess = `Folder '${element.name}' has been published.`;
      messageError = `Folder '${element.name}' can not be published.`;
    } else if (element.kind === ContentKind.DOCUMENT) {
      title = 'Publish Document';
      content = `Are you sure about publishing the Document with the name: ${element.name}.`;
      messageSuccess = `Document '${element.name}' has been published.`;
      messageError = `Document '${element.name}' can not be published.`;
    }
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: title,
          content: content,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.contentService.publish(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(messageSuccess);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.success(messageError);
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
    this.isLoading.set(true);
    if (element.kind === ContentKind.DOCUMENT) {
      if (this.schemasMapById.has(element.schema)) {
        this.router.navigate(['features', 'spaces', this.spaceId(), 'contents', element.id]);
      } else {
        this.notificationService.error(`Content Schema can not be found.`);
      }
      return;
    }

    if (element.kind === ContentKind.FOLDER) {
      this.selection.clear();
      const contentPath = ObjectUtils.clone(this.spaceStore.contentPath() || []);
      contentPath.push({
        name: element.name,
        fullSlug: element.fullSlug,
      });
      this.spaceStore.changeContentPath(contentPath);
    }
  }

  navigateToSlug(pathItem: PathItem) {
    this.isLoading.set(true);
    this.selection.clear();
    const contentPath = ObjectUtils.clone(this.spaceStore.contentPath() || []);
    const idx = contentPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    contentPath.splice(idx + 1);
    this.spaceStore.changeContentPath(contentPath);
  }

  openApiV1InNewTab(token: string) {
    const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId()}/links`);
    url.searchParams.set('token', token);
    window.open(url, '_blank');
  }

  openLinksV1InNewTab(): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(this.availableToken);
    } else {
      this.tokenService.findFirst(this.spaceId()).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(this.availableToken);
          } else {
            this.notificationService.error('Please create Access Token in your Space Settings');
          }
        },
      });
    }
  }

  openImportDialog() {
    this.dialog
      .open<ImportDialogComponent, void, ImportDialogReturn>(ImportDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        tap(console.log),
        switchMap(it => this.taskService.createContentImportTask(this.spaceId(), it!.file)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content Import Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
        },
        error: () => {
          this.notificationService.error('Content Import Task can not be created.');
        },
      });
  }

  openExportDialog() {
    this.dialog
      .open<ExportDialogComponent, ExportDialogModel, ExportDialogReturn>(ExportDialogComponent, {
        panelClass: 'sm',
        data: {
          spaceId: this.spaceId(),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createContentExportTask(this.spaceId(), it?.path)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Content Export Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Content Export Task can not be created.');
        },
      });
  }
}

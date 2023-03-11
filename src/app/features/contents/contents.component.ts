import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap, takeUntil, tap} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {selectSpace} from '@core/state/space/space.selector';
import {NotificationService} from '@shared/services/notification.service';
import {Schema, SchemaType} from '@shared/models/schema.model';
import {SchemaService} from '@shared/services/schema.service';
import {combineLatest, Subject} from 'rxjs';
import {
  ConfirmationDialogComponent
} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  ConfirmationDialogModel
} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {
  Content,
  ContentFolderCreate,
  ContentKind,
  ContentDocumentCreate,
  ContentUpdate
} from '@shared/models/content.model';
import {ContentService} from '@shared/services/content.service';
import {ObjectUtils} from '@core/utils/object-utils.service';
import {SelectionModel} from '@angular/cdk/collections';
import {PathItem} from '@core/state/space/space.model';
import {actionSpaceContentPathChange} from '@core/state/space/space.actions';
import {AddDocumentDialogComponent} from './add-document-dialog/add-document-dialog.component';
import {AddDocumentDialogModel} from './add-document-dialog/add-document-dialog.model';
import {AddFolderDialogComponent} from './add-folder-dialog/add-folder-dialog.component';
import {AddFolderDialogModel} from './add-folder-dialog/add-folder-dialog.model';
import {EditDialogComponent} from './edit-dialog/edit-dialog.component';
import {EditDialogModel} from './edit-dialog/edit-dialog.model';

@Component({
  selector: 'll-contents',
  templateUrl: './contents.component.html',
  styleUrls: ['./contents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentsComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<Content> = new MatTableDataSource<Content>([]);
  displayedColumns: string[] = ['select', 'status', 'name', 'slug', 'schema', 'publishedAt', 'createdAt', 'updatedAt'];
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

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schemasService: SchemaService,
    private readonly contentService: ContentService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
  ) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        tap(it => {
          if (it.contentPath && it.contentPath.length > 0) {
            this.contentPath = it.contentPath;
          } else {
            this.contentPath = [{
              name: 'Root',
              fullSlug: ''
            }];
          }
        }),
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.schemasService.findAll(it.id, SchemaType.ROOT),
            this.contentService.findAll(it.id, this.parentPath)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, schemas, contents]) => {
          this.selectedSpace = space
          this.schemas = schemas;
          this.schemasMap = schemas.reduce((acc, value) => acc.set(value.id, value), new Map<string, Schema>())
          this.contents = contents;
          // if (this.contentPath.length == 0) {
          //   this.contentPath.push({
          //     name: 'Root',
          //     fullSlug: ''
          //   })
          // }

          this.dataSource = new MatTableDataSource<Content>(contents);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.selection.clear()
          this.cd.markForCheck();
        }
      })
  }

  openAddDocumentDialog(): void {
    this.dialog.open<AddDocumentDialogComponent, AddDocumentDialogModel, ContentDocumentCreate>(
      AddDocumentDialogComponent, {
        width: '500px',
        data: {
          schemas: this.schemas,
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.contentService.createDocument(this.selectedSpace!.id, this.parentPath, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Document has been created.');
        },
        error: () => {
          this.notificationService.error('Document can not be created.');
        }
      });
  }

  openAddFolderDialog(): void {
    this.dialog.open<AddFolderDialogComponent, AddFolderDialogModel, ContentFolderCreate>(
      AddFolderDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.contentService.createFolder(this.selectedSpace!.id, this.parentPath, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Folder has been created.');
        },
        error: () => {
          this.notificationService.error('Folder can not be created.');
        }
      });
  }

  openEditDialog(element: Content): void {
    this.dialog.open<EditDialogComponent, EditDialogModel, ContentUpdate>(
      EditDialogComponent, {
        width: '500px',
        data: {
          content: ObjectUtils.clone(element),
          reservedNames: this.contents.map(it => it.name),
          reservedSlugs: this.contents.map(it => it.slug),
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.contentService.update(this.selectedSpace!.id, element.id, this.parentPath, it!)
        )
      )
      .subscribe({
        next: () => {
          this.selection.clear()
          this.cd.markForCheck()
          this.notificationService.success('Content has been updated.');
        },
        error: () => {
          this.notificationService.error('Content can not be updated.');
        }
      });
  }

  openDeleteDialog(element: Content): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Content',
          content: `Are you sure about deleting Content with name: ${element.name}.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.contentService.delete(this.selectedSpace!.id, element)
        )
      )
      .subscribe({
        next: () => {
          this.selection.clear()
          this.cd.markForCheck()
          this.notificationService.success(`Content '${element.name}' has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Content '${element.name}' can not be deleted.`);
        }
      });
  }


  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
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
    if (element.kind === ContentKind.DOCUMENT) {
      element.publishedAt
      if (this.schemasMap.has(element.schema)) {
        this.router.navigate(['features', 'contents', element.id]);
      } else {
        this.notificationService.warn(`Content Schema can not be found.`);
      }
      return;
    }

    if (element.kind === ContentKind.FOLDER) {
      this.selection.clear()
      const contentPath = ObjectUtils.clone(this.contentPath)
      contentPath.push({
        name: element.name,
        fullSlug: element.fullSlug
      })
      this.store.dispatch(actionSpaceContentPathChange({contentPath}))

    }
  }

  navigateToSlug(pathItem: PathItem) {
    this.selection.clear()
    const contentPath = ObjectUtils.clone(this.contentPath)
    const idx = contentPath.findIndex((it) => it.fullSlug == pathItem.fullSlug);
    contentPath.splice(idx + 1);
    this.store.dispatch(actionSpaceContentPathChange({contentPath}))
  }

  openLinksInNewTab() {
    const url = `${location.origin}/api/v1/spaces/${this.selectedSpace?.id}/links`
    window.open(url, '_blank')
  }
}

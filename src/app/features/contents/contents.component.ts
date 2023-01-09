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
import {Schematic, SchematicType} from '@shared/models/schematic.model';
import {SchematicService} from '@shared/services/schematic.service';
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
  ContentPageCreate,
  ContentUpdate
} from '@shared/models/content.model';
import {ContentService} from '@shared/services/content.service';
import {PageAddDialogComponent} from './page-add-dialog/page-add-dialog.component';
import {PageAddDialogModel} from './page-add-dialog/page-add-dialog.model';
import {ContentEditDialogComponent} from './content-edit-dialog/content-edit-dialog.component';
import {ContentEditDialogModel} from './content-edit-dialog/content-edit-dialog.model';
import {ObjectUtils} from '@core/utils/object-utils.service';
import {FolderAddDialogComponent} from './folder-add-dialog/folder-add-dialog.component';
import {FolderAddDialogModel} from './folder-add-dialog/folder-add-dialog.model';
import {SelectionModel} from '@angular/cdk/collections';
import {ContentPathItem} from '@core/state/space/space.model';
import {actionSpaceContentPathChange} from '@core/state/space/space.actions';

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
  displayedColumns: string[] = ['select', 'status', 'name', 'schematic', 'createdAt', 'updatedAt'];
  selection = new SelectionModel<Content>(true, []);

  schematics: Schematic[] = [];
  schematicsMap: Map<string, Schematic> = new Map<string, Schematic>();
  contents: Content[] = [];
  contentPath: ContentPathItem[] = [];

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
    private readonly schematicService: SchematicService,
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
            this.schematicService.findAll(it.id, SchematicType.ROOT),
            this.contentService.findAll(it.id, this.parentPath)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, schematics, contents]) => {
          this.selectedSpace = space
          this.schematics = schematics;
          this.schematicsMap = schematics.reduce((acc, value) => acc.set(value.id, value), new Map<string, Schematic>())
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

  openAddPageDialog(): void {
    this.dialog.open<PageAddDialogComponent, PageAddDialogModel, ContentPageCreate>(
      PageAddDialogComponent, {
        width: '500px',
        data: {
          schematics: this.schematics
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.contentService.createPage(this.selectedSpace!.id, this.parentPath, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Page has been created.');
        },
        error: () => {
          this.notificationService.error('Page can not be created.');
        }
      });
  }

  openAddFolderDialog(): void {
    this.dialog.open<FolderAddDialogComponent, FolderAddDialogModel, ContentFolderCreate>(
      FolderAddDialogComponent, {
        width: '500px'
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
    this.dialog.open<ContentEditDialogComponent, ContentEditDialogModel, ContentUpdate>(
      ContentEditDialogComponent, {
        width: '500px',
        data: {
          page: ObjectUtils.clone(element)
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.contentService.update(this.selectedSpace!.id, element.id, it!)
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

  openDeleteDialog(elements: Content[]): void {
    const ids = elements.map(it => it.id)
    const names = elements.map(it => it.name)
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Content',
          content: `Are you sure about deleting Content with names: ${names.join(', ')}.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.contentService.delete(this.selectedSpace!.id, ...ids)
        )
      )
      .subscribe({
        next: () => {
          this.selection.clear()
          this.cd.markForCheck()
          this.notificationService.success(`Content has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Content can not be deleted.`);
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

  onContentRowSelect(element: Content): void {
    if (element.kind === ContentKind.PAGE) {
      if (this.schematicsMap.has(element.schematic)) {
        this.router.navigate(['features', 'contents', element.id]);
      } else {
        this.notificationService.warn(`Content Schematic can not be found.`);
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

  navigateToSlug(pathItem: ContentPathItem) {
    this.selection.clear()
    const contentPath = ObjectUtils.clone(this.contentPath)
    const idx = contentPath.findIndex((it) => it.fullSlug == pathItem.fullSlug);
    contentPath.splice(idx + 1);
    this.store.dispatch(actionSpaceContentPathChange({contentPath}))
  }
}

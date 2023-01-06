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
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '../../core/state/core.state';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {selectSpace} from '../../core/state/space/space.selector';
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
  ContentPageCreate,
  ContentPageUpdate,
  Content,
  ContentPage
} from '@shared/models/content.model';
import {ContentService} from '@shared/services/content.service';
import {PageAddDialogComponent} from './page-add-dialog/page-add-dialog.component';
import {PageAddDialogModel} from './page-add-dialog/page-add-dialog.model';
import {PageEditDialogComponent} from './page-edit-dialog/page-edit-dialog.component';
import {PageEditDialogModel} from './page-edit-dialog/page-edit-dialog.model';
import {ObjectUtils} from '../../core/utils/object-utils.service';

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
  displayedColumns: string[] = ['id', 'status', 'name', 'schematic', 'createdAt', 'updatedAt', 'actions'];
  schematics: Schematic[] = [];
  schematicsMap: Map<string, Schematic> = new Map<string, Schematic>();
  contents: Content[] = [];

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
    private readonly store: Store<AppState>
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
          combineLatest([
            this.spaceService.findById(it.id),
            this.schematicService.findAll(it.id, SchematicType.ROOT),
            this.contentService.findAll(it.id)
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
          this.dataSource = new MatTableDataSource<Content>(contents);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
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
          this.contentService.createPage(this.selectedSpace!.id, it!)
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

  openPageEditDialog(element: ContentPage): void {
    this.dialog.open<PageEditDialogComponent, PageEditDialogModel, ContentPageUpdate>(
      PageEditDialogComponent, {
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
          this.notificationService.success('Page has been updated.');
        },
        error: () => {
          this.notificationService.error('Page can not be updated.');
        }
      });
  }

  openContentEditDialog(element: Content): void {
    this.router.navigate(['features','contents',element.id]);
  }

  openDeletePageDialog(element: Content): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Page',
          content: `Are you sure about deleting Page with name '${element.name}'.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.contentService.delete(this.selectedSpace!.id, element.id)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Page '${element.name}' has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Page '${element.name}' can not be deleted.`);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
}

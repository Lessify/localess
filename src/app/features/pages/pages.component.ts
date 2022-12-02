import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap} from 'rxjs/operators';
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
import {combineLatest} from 'rxjs';
import {ConfirmationDialogComponent} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {ConfirmationDialogModel} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {Page, PageCreate, PageUpdate} from '@shared/models/page.model';
import {PageService} from '@shared/services/page.service';
import {PageAddDialogComponent} from './page-add-dialog/page-add-dialog.component';
import {PageAddDialogModel} from './page-add-dialog/page-add-dialog.model';
import {PageEditDialogComponent} from './page-edit-dialog/page-edit-dialog.component';
import {PageEditDialogModel} from './page-edit-dialog/page-edit-dialog.model';
import {ObjectUtils} from '../../core/utils/object-utils.service';

@Component({
  selector: 'll-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagesComponent implements OnInit {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<Page> = new MatTableDataSource<Page>([]);
  displayedColumns: string[] = ['id', 'name', 'schematic', 'createdAt', 'updatedAt', 'actions'];
  schematics: Schematic[] = [];
  schematicsMap: Map<string, Schematic> = new Map<string, Schematic>();
  articles: Page[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schematicService: SchematicService,
    private readonly articleService: PageService,
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
            this.articleService.findAll(it.id)
          ])
        )
      )
      .subscribe({
        next: ([space, schematics, articles]) => {
          this.selectedSpace = space
          this.schematics = schematics;
          this.schematicsMap = schematics.reduce((acc, value) => acc.set(value.id, value), new Map<string, Schematic>())
          this.articles = articles;
          this.dataSource = new MatTableDataSource<Page>(articles);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  openAddDialog(): void {
    this.dialog.open<PageAddDialogComponent, PageAddDialogModel, PageCreate>(
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
          this.articleService.create(this.selectedSpace!.id, it!)
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

  openEditDialog(element: Page): void {
    this.dialog.open<PageEditDialogComponent, PageEditDialogModel, PageUpdate>(
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
          this.articleService.update(this.selectedSpace!.id, element.id, it!)
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

  openContentEditDialog(element: Page): void {
    this.router.navigate(['features','pages',element.id]);
  }

  openDeleteDialog(element: Page): void {
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
          this.articleService.delete(this.selectedSpace!.id, element.id)
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
}

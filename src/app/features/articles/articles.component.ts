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
import {
  ConfirmationDialogComponent
} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  ConfirmationDialogModel
} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {
  Article,
  ArticleCreate,
  ArticleUpdate
} from '@shared/models/article.model';
import {ArticleService} from '@shared/services/article.service';
import {ArticleAddDialogComponent} from './article-add-dialog/article-add-dialog.component';
import {ArticleAddDialogModel} from './article-add-dialog/article-add-dialog.model';
import {
  ArticleEditDialogComponent
} from './article-edit-dialog/article-edit-dialog.component';
import {ArticleEditDialogModel} from './article-edit-dialog/article-edit-dialog.model';
import {ObjectUtils} from '../../core/utils/object-utils.service';
import {
  ArticleContentEditDialogComponent
} from './article-content-edit-dialog/article-content-edit-dialog.component';
import {
  ArticleContentEditDialogModel
} from './article-content-edit-dialog/article-content-edit-dialog.model';

@Component({
  selector: 'll-articles',
  templateUrl: './articles.component.html',
  styleUrls: ['./articles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticlesComponent implements OnInit {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<Article> = new MatTableDataSource<Article>([]);
  displayedColumns: string[] = ['id', 'name', 'schematic', 'createdOn', 'updatedOn', 'actions'];
  schematics: Schematic[] = [];
  schematicsMap: Map<string, Schematic> = new Map<string, Schematic>();
  articles: Article[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schematicService: SchematicService,
    private readonly articleService: ArticleService,
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
          this.dataSource = new MatTableDataSource<Article>(articles);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  openAddDialog(): void {
    this.dialog.open<ArticleAddDialogComponent, ArticleAddDialogModel, ArticleCreate>(
      ArticleAddDialogComponent, {
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
          this.notificationService.success('Article has been created.');
        },
        error: () => {
          this.notificationService.error('Article can not be created.');
        }
      });
  }

  openEditDialog(element: Article): void {
    this.dialog.open<ArticleEditDialogComponent, ArticleEditDialogModel, ArticleUpdate>(
      ArticleEditDialogComponent, {
        width: '500px',
        data: {
          article: ObjectUtils.clone(element)
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
          this.notificationService.success('Article has been updated.');
        },
        error: () => {
          this.notificationService.error('Article can not be updated.');
        }
      });
  }

  openContentEditDialog(element: Article): void {
    const schematic = this.schematicsMap.get(element.schematicId)
    if(schematic) {
      this.dialog.open<ArticleContentEditDialogComponent, ArticleContentEditDialogModel, any>(
        ArticleContentEditDialogComponent, {
          width: '500px',
          data: {
            article: ObjectUtils.clone(element),
            schematic: schematic
          }
        })
        .afterClosed()
        .pipe(
          filter(it => it !== undefined),
          switchMap(it =>
            this.articleService.updateContent(this.selectedSpace!.id, element.id, it)
          )
        )
        .subscribe({
          next: () => {
            this.notificationService.success('Article has been updated.');
          },
          error: () => {
            this.notificationService.error('Article can not be updated.');
          }
        });
    } else {
      this.notificationService.error('Schematic associated with the article can not be found.');
    }
  }

  openDeleteDialog(element: Article): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Schematic',
          content: `Are you sure about deleting Schematic with name '${element.name}'.`
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
          this.notificationService.success(`Article '${element.name}' has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Article '${element.name}' can not be deleted.`);
        }
      });
  }
}

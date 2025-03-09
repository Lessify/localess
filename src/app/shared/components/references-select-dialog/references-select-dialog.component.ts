import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  Inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { BreadcrumbComponent, BreadcrumbItemComponent } from '@shared/components/breadcrumb';
import { StatusComponent } from '@shared/components/status';
import { Content, ContentDocument, ContentKind } from '@shared/models/content.model';
import { Schema, SchemaType } from '@shared/models/schema.model';
import { ContentService } from '@shared/services/content.service';
import { SchemaService } from '@shared/services/schema.service';
import { PathItem } from '@shared/stores/space.store';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ReferencesSelectDialogModel } from './references-select-dialog.model';

@Component({
  selector: 'll-references-select-dialog',
  standalone: true,
  templateUrl: './references-select-dialog.component.html',
  styleUrls: ['./references-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatProgressBarModule,
    BreadcrumbComponent,
    BreadcrumbItemComponent,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    StatusComponent,
    MatTooltipModule,
    MatIconModule,
    CommonModule,
    MatPaginatorModule,
    MatButtonModule,
  ],
})
export class ReferencesSelectDialogComponent implements OnInit, OnDestroy {
  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  schemas = signal<Schema[]>([]);
  schemasMapById = computed(() => new Map(this.schemas().map(it => [it.id, it])));
  contents = signal<Content[]>([]);
  dataSource: MatTableDataSource<Content> = new MatTableDataSource<Content>([]);
  displayedColumns: string[] = ['select', 'status', 'name', 'slug', 'schema', 'updatedAt'];
  selection = new SelectionModel<ContentDocument>(this.data.multiple, [], undefined, (o1, o2) => o1.id === o2.id);
  contentPath: PathItem[] = [];

  get parentPath(): string {
    if (this.contentPath.length > 0) {
      return this.contentPath[this.contentPath.length - 1].fullSlug;
    }
    return '';
  }

  // Subscriptions
  path$ = new BehaviorSubject<PathItem[]>([
    {
      name: 'Root',
      fullSlug: '',
    },
  ]);
  // Subscriptions
  private destroyRef = inject(DestroyRef);
  // Loading
  isLoading = signal(true);

  constructor(
    private readonly schemasService: SchemaService,
    private readonly contentService: ContentService,
    readonly fe: FormErrorHandlerService,
    private readonly cd: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: ReferencesSelectDialogModel,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.path$
      .asObservable()
      .pipe(
        switchMap(path => {
          this.contentPath = path;
          return combineLatest([
            this.schemasService.findAll(this.data.spaceId, SchemaType.ROOT),
            this.contentService.findAll(this.data.spaceId, this.parentPath),
          ]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ([schemas, contents]) => {
          this.schemas.set(schemas);
          this.contents.set(contents);
          this.dataSource = new MatTableDataSource<Content>(contents);
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  navigateToSlug(pathItem: PathItem) {
    const contentPath = ObjectUtils.clone(this.contentPath);
    const idx = contentPath.findIndex(it => it.fullSlug == pathItem.fullSlug);
    contentPath.splice(idx + 1);
    this.path$.next(contentPath);
  }

  onRowSelect(element: Content): void {
    if (element.kind === ContentKind.DOCUMENT) {
      this.selection.toggle(element);
      return;
    } else if (element.kind === ContentKind.FOLDER) {
      this.isLoading.set(false);
      const contentPath = ObjectUtils.clone(this.contentPath);
      contentPath.push({
        name: element.name,
        fullSlug: element.fullSlug,
      });
      this.path$.next(contentPath);
    }
  }

  ngOnDestroy(): void {
    this.path$.complete();
  }
}

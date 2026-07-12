import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideFolderRoot } from '@ng-icons/lucide';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { Content, ContentDocument, ContentKind } from '@shared/models/content.model';
import { Schema, SchemaType } from '@shared/models/schema.model';
import { ContentService } from '@shared/services/content.service';
import { SchemaService } from '@shared/services/schema.service';
import { PathItem } from '@shared/stores/space.store';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DocumentStatusComponent } from '../document-status/document-status.component';
import { ReferencesSelectDialogModel } from './references-select-dialog.model';

@Component({
  selector: 'll-references-select-dialog',
  templateUrl: './references-select-dialog.component.html',
  styleUrls: ['./references-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    LlTableImports,
    LlPaginatorImports,
    CommonModule,
    HlmBreadcrumbImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmIconImports,
    HlmProgressImports,
    HlmTooltipImports,
    DocumentStatusComponent,
  ],
  providers: [
    provideIcons({
      lucideFolderRoot,
      lucideFolder,
    }),
  ],
})
export class ReferencesSelectDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly schemasService = inject(SchemaService);
  private readonly contentService = inject(ContentService);
  readonly fe = inject(FormErrorHandlerService);
  private readonly injector = inject(Injector);
  data = inject<ReferencesSelectDialogModel>(MAT_DIALOG_DATA);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  schemas = signal<Schema[]>([]);
  schemasMapById = computed(() => new Map(this.schemas().map(it => [it.id, it])));
  contents = signal<Content[]>([]);
  readonly dataSource = new TableDataSource<Content>(this.contents, this.injector);
  displayedColumns: string[] = ['select', 'status', 'name', 'schema', 'updatedAt'];
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
          this.isLoading.set(false);
        },
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
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

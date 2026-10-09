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
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DocumentStatusComponent } from '../document-status/document-status.component';
import { ReferencesSelectDialogContext, ReferencesSelectDialogResult } from './references-select-dialog.model';

@Component({
  selector: 'll-references-select-dialog',
  templateUrl: './references-select-dialog.component.html',
  styleUrls: ['./references-select-dialog.component.scss'],
  // Three rows: header, a scrolling middle, pinned footer. `minmax(0,1fr)` is what lets the middle
  // row shrink below its content so it scrolls rather than pushing the footer off-screen.
  host: { class: 'grid grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmDialogImports,
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
  private readonly dialogRef = inject<BrnDialogRef<ReferencesSelectDialogResult>>(BrnDialogRef);

  /** Required: scopes the browser to a space, and `multiple` decides the selection mode. */
  private readonly context = injectBrnDialogContext<ReferencesSelectDialogContext>();

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  schemas = signal<Schema[]>([]);
  schemasMapById = computed(() => new Map(this.schemas().map(it => [it.id, it])));
  contents = signal<Content[]>([]);
  readonly dataSource = new TableDataSource<Content>(this.contents, this.injector);
  displayedColumns: string[] = ['select', 'status', 'name', 'schema', 'updatedAt'];
  selection = new SelectionModel<ContentDocument>(this.context.multiple, [], undefined, (o1, o2) => o1.id === o2.id);
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
            this.schemasService.findAll(this.context.spaceId, SchemaType.ROOT),
            this.contentService.findAll(this.context.spaceId, this.parentPath),
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

  save(): void {
    this.dialogRef.close(this.selection.selected as ReferencesSelectDialogResult);
  }
}

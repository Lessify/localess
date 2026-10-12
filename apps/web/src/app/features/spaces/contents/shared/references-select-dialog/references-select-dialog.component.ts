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
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ContentService } from '@core/services/content.service';
import { SchemaService } from '@core/services/schema.service';
import { Content, ContentDocument, ContentFolderSummary, ContentKind, Schema, SchemaType } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideFolderRoot } from '@ng-icons/lucide';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { breadcrumbs } from '../content-folders';
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
export class ReferencesSelectDialogComponent implements OnInit, AfterViewInit {
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
  schemasMapByName = computed(() => new Map(this.schemas().map(it => [it.name, it])));
  contents = signal<Content[]>([]);
  readonly dataSource = new TableDataSource<Content>(this.contents, this.injector);
  displayedColumns: string[] = ['select', 'status', 'name', 'schema', 'updatedAt'];
  selection = new SelectionModel<ContentDocument>(this.context.multiple, [], undefined, (o1, o2) => o1.id === o2.id);
  /** Every folder of the space: the breadcrumbs are built from it. */
  private readonly folders = toSignal(this.contentService.findAllFolders(this.context.spaceId), {
    initialValue: [] as ContentFolderSummary[],
  });
  private readonly folderMap = computed(() => new Map(this.folders().map(it => [it.id, it])));
  /** The folder shown; `null`: the root. */
  readonly folderId = signal<string | null>(null);
  /** The folders from the root down to the one shown. */
  readonly trail = computed(() => breadcrumbs(this.folderMap(), this.folderId()));

  // Subscriptions
  private readonly folderId$ = toObservable(this.folderId);
  // Subscriptions
  private destroyRef = inject(DestroyRef);
  // Loading
  isLoading = signal(true);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.folderId$
      .pipe(
        switchMap(folderId =>
          combineLatest([
            this.schemasService.findAll(this.context.spaceId, SchemaType.ROOT),
            this.contentService.findAll(this.context.spaceId, folderId ?? undefined),
          ]),
        ),
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

  /** A breadcrumb: a folder, or `null` for the root. */
  navigateToFolder(folderId: string | null) {
    this.folderId.set(folderId);
  }

  onRowSelect(element: Content): void {
    if (element.kind === ContentKind.DOCUMENT) {
      this.selection.toggle(element);
      return;
    } else if (element.kind === ContentKind.FOLDER) {
      this.isLoading.set(false);
      this.folderId.set(element.id);
    }
  }

  save(): void {
    this.dialogRef.close(this.selection.selected as ReferencesSelectDialogResult);
  }
}

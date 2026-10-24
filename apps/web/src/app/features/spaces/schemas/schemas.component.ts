import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  OnInit,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { SchemaService } from '@core/services/schema.service';
import { TaskService } from '@core/services/task.service';
import { SpaceStore } from '@core/stores/space.store';
import { apiErrorMessage } from '@core/utils/api-error';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { Schema, SchemaCreate, SchemaFieldKind, SchemaType } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCloudDownload,
  lucideEllipsisVertical,
  lucideFileBox,
  lucideList,
  lucidePlus,
  lucideReplace,
  lucideTrash,
  lucideUploadCloud,
  lucideWorkflow,
} from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import {
  FilterDef,
  FilterOption,
  FilterToolbarValue,
  LlFilterToolbarImports,
} from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { openTaskProgressDialog } from '@shared/components/task-progress-dialog';
import { schemaTypeDescriptions, sortSchema } from '@shared/models/schema.model';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { of } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';

import { AddDialogComponent } from './add-dialog/add-dialog.component';
import { AddDialogContext } from './add-dialog/add-dialog.model';
import { EditIdDialogComponent, EditIdDialogContext, EditIdDialogResult } from './edit-id-dialog';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogResult } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogResult } from './import-dialog/import-dialog.model';
import { describeSchemaUsage } from './shared/schema-usage';

@Component({
  selector: 'll-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HasRolePipe,
    CommonModule,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmButtonImports,
    HlmIconImports,
    HlmDropdownMenuImports,
    HlmProgressImports,
    HlmTooltipImports,
    HlmBadgeImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEllipsisVertical,
      lucideCloudDownload,
      lucideUploadCloud,
      lucideTrash,
      lucideReplace,
      lucideList,
      lucideFileBox,
      lucideWorkflow,
    }),
  ],
})
export class SchemasComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly schemaService = inject(SchemaService);
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly spaceStore = inject(SpaceStore);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  // Inputs
  spaceId = input.required<string>();

  /** A schema type's name, icon and description (typed key: the table and the select hand over untyped values). */
  protected readonly schemaTypeDescription = (type: SchemaType) => schemaTypeDescriptions[type];

  displayedColumns: string[] = ['type', 'name', 'description', 'labels', /*'createdAt',*/ 'updatedAt', 'actions'];
  /**
   * Every schema of the space, from `SpaceStore` (live): the editors need them all anyway, so the list is not paged on
   * the server; search, label filter, sort and paging run here (docs/server/pagination.md#not-paged-and-why).
   */
  readonly schemas = computed(() => [...this.spaceStore.schemas()].sort(sortSchema));
  readonly dataSource = new TableDataSource<Schema>(this.schemas, this.injector);
  /** Names (shown as IDs) already taken; content and fields refer to schemas by name. */
  schemaNames = computed(() => this.schemas().map(it => it.name));
  schemasInUse = computed(() => this.inUseSchema(this.schemas()));

  // Loading
  readonly isLoading = computed(() => !this.spaceStore.schemasLoaded());

  //Labels
  readonly labelOptions: Signal<FilterOption[]> = computed(() => {
    const tmp = this.schemas()
      .map(it => it.labels)
      .flat()
      .filter(it => it != undefined)
      .map(it => it!);
    return [...new Set<string>(tmp)].map(label => ({ value: label, label }));
  });

  readonly filters: Signal<FilterDef[]> = computed(() => [
    { key: 'labels', label: 'Labels', options: this.labelOptions(), mode: 'multiple' },
  ]);

  selectedLabels = signal<string[]>([]);

  ngOnInit(): void {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<Schema>({
      searchFields: schema => [schema.name, schema.displayName, schema.description],
      filterFields: [{ key: 'labels', accessor: schema => schema.labels }],
    });
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.selectedLabels.set((value['labels'] as string[]) ?? []);
    this.dataSource.filter = JSON.stringify(value);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
  }

  openAddDialog(): void {
    this.dialog
      .open<SchemaCreate, AddDialogContext>(AddDialogComponent, {
        context: {
          reservedNames: this.schemaNames(),
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.schemaService.create(this.spaceId(), it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema has been created.');
        },
        error: () => {
          this.notificationService.error('Schema can not be created.');
        },
      });
  }

  openEditIdDialog(event: MouseEvent, element: Schema): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    this.schemaService
      .findUsage(this.spaceId(), element.id)
      .pipe(
        // Without the usage, the rename is still offered.
        catchError(() => of(undefined)),
        switchMap(usage =>
          this.dialog
            .open<EditIdDialogResult, EditIdDialogContext>(EditIdDialogComponent, {
              context: {
                name: element.name,
                reservedNames: this.schemaNames(),
                usage,
              },
              contentClass: DIALOG_WIDTH_SM,
            })
            .closed$.pipe(take(1)),
        ),
        filter(it => it !== undefined),
        switchMap(it => this.schemaService.rename(this.spaceId(), element.id, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema ID has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notifyError('Schema ID can not be updated.', err);
        },
      });
  }

  onRowSelect(element: Schema): void {
    if (element.type === SchemaType.ROOT || element.type === SchemaType.NODE) {
      this.router.navigate(['features', 'spaces', this.spaceId(), 'schemas', 'comp', element.id]);
    } else if (element.type === SchemaType.ENUM) {
      this.router.navigate(['features', 'spaces', this.spaceId(), 'schemas', 'enum', element.id]);
    }
  }

  /** While the schema is in use the dialog only says where (the server refuses too); otherwise it asks first. */
  openDeleteDialog(event: MouseEvent, element: Schema): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.schemaService
      .findUsage(this.spaceId(), element.id)
      .pipe(
        // Without the usage, the delete is still offered; the server refuses it if the schema is in use.
        map(usage => describeSchemaUsage(usage)),
        catchError(() => of(undefined)),
        switchMap(inUse =>
          this.dialog
            .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
              context: inUse
                ? {
                    title: 'Delete Schema',
                    content: `Schema '${element.name}' can not be deleted while it is in use.\n${inUse}`,
                    confirmable: false,
                  }
                : {
                    title: 'Delete Schema',
                    content: `Are you sure about deleting Schema with name '${element.name}'.`,
                    variant: 'destructive',
                  },
              contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
            })
            .closed$.pipe(take(1)),
        ),
        filter(it => it || false),
        switchMap(() => this.schemaService.remove(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Schema '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notifyError(`Schema '${element.name}' can not be deleted.`, err);
        },
      });
  }

  openImportDialog() {
    this.dialog
      .open<ImportDialogResult>(ImportDialogComponent, { contentClass: DIALOG_WIDTH_SM })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createSchemaImport(this.spaceId(), it.file)),
      )
      .subscribe({
        next: task => openTaskProgressDialog(this.dialog, { spaceId: this.spaceId(), task, title: 'Schemas Import' }),
        error: (err: unknown) => this.notificationService.error(apiErrorMessage(err, 'Schemas can not be imported.')),
      });
  }

  openExportDialog() {
    this.dialog
      .open<ExportDialogResult>(ExportDialogComponent, { contentClass: DIALOG_WIDTH_SM })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(() => this.taskService.createSchemaExport(this.spaceId())),
      )
      .subscribe({
        next: task => openTaskProgressDialog(this.dialog, { spaceId: this.spaceId(), task, title: 'Schemas Export' }),
        error: (err: unknown) => this.notificationService.error(apiErrorMessage(err, 'Schemas can not be exported.')),
      });
  }

  /**
   * Schema names that are in use by other schemas
   * @param schemas
   */
  inUseSchema(schemas: Schema[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const schema of schemas) {
      if (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE) {
        for (const field of schema.fields || []) {
          if (field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) {
            for (const fieldSchema of field.schemas || []) {
              if (result[fieldSchema]) {
                result[fieldSchema].push(schema.name);
              } else {
                result[fieldSchema] = [schema.name];
              }
            }
          } else if (field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) {
            const fieldEnum = field.source;
            if (result[fieldEnum]) {
              result[fieldEnum].push(schema.name);
            } else {
              result[fieldEnum] = [schema.name];
            }
          }
        }
      }
    }
    return result;
  }

  /** A refusal (409, e.g. a schema in use) carries the server's reason as the description. */
  private notifyError(message: string, error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409 && typeof error.error?.message === 'string') {
      this.notificationService.error(message, { description: error.error.message });
    } else {
      this.notificationService.error(message);
    }
  }
}

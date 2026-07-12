import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  input,
  OnInit,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
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
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {
  FilterDef,
  FilterOption,
  FilterToolbarValue,
  LlFilterToolbarImports,
} from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { Schema, SchemaCreate, SchemaFieldKind, SchemaType, schemaTypeDescriptions, sortSchema } from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { TaskService } from '@shared/services/task.service';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap } from 'rxjs/operators';

import { AddDialogComponent } from './add-dialog/add-dialog.component';
import { AddDialogModel } from './add-dialog/add-dialog.model';
import { EditIdDialogComponent, EditIdDialogModel } from './edit-id-dialog';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogReturn } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogReturn } from './import-dialog/import-dialog.model';

@Component({
  selector: 'll-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CanUserPerformPipe,
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
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  // Inputs
  spaceId = input.required<string>();

  schemaTypeDescriptions = schemaTypeDescriptions;

  displayedColumns: string[] = ['type', 'name', 'description', 'labels', /*'createdAt',*/ 'updatedAt', 'actions'];
  schemas = signal<Schema[]>([]);
  readonly dataSource = new TableDataSource<Schema>(this.schemas, this.injector);
  schemaIds = computed(() => this.schemas().map(it => it.id));
  schemasInUse = computed(() => this.inUseSchema(this.schemas()));

  private destroyRef = inject(DestroyRef);

  // Loading
  isLoading = signal(true);

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
      searchFields: schema => [schema.id, schema.displayName, schema.description],
      filterFields: [{ key: 'labels', accessor: schema => schema.labels }],
    });
    this.loadData(this.spaceId());
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.selectedLabels.set((value['labels'] as string[]) ?? []);
    this.dataSource.filter = JSON.stringify(value);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
  }

  loadData(spaceId: string): void {
    this.schemaService
      .findAll(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: schemas => {
          this.schemas.set(schemas.sort(sortSchema));
          this.isLoading.set(false);
        },
      });
  }

  openAddDialog(): void {
    this.dialog
      .open<AddDialogComponent, AddDialogModel, SchemaCreate>(AddDialogComponent, {
        panelClass: 'sm',
        data: {
          reservedIds: this.schemaIds(),
        },
      })
      .afterClosed()
      .pipe(
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
    this.dialog
      .open<EditIdDialogComponent, EditIdDialogModel, string>(EditIdDialogComponent, {
        panelClass: 'sm',
        data: {
          id: element.id,
          reservedIds: this.schemaIds(),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.schemaService.updateId(this.spaceId(), element, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema ID has been updated.');
        },
        error: err => {
          console.error(err);
          this.notificationService.error('Schema ID can not be updated.');
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

  openDeleteDialog(event: MouseEvent, element: Schema): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Schema',
          content: `Are you sure about deleting Schema with name '${element.id}'.\n Any Content document associated with the Schema will not work anymore.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.schemaService.delete(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Schema '${element.id}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Schema '${element.id}' can not be deleted.`);
        },
      });
  }

  openImportDialog() {
    this.dialog
      .open<ImportDialogComponent, void, ImportDialogReturn>(ImportDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createSchemaImportTask(this.spaceId(), it!.file)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema Import Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: () => {
          this.notificationService.error('Schema Import Task can not be created.');
        },
      });
  }

  openExportDialog() {
    this.dialog
      .open<ExportDialogComponent, void, ExportDialogReturn>(ExportDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(() => this.taskService.createSchemaExportTask(this.spaceId())),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema Export Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Schema Export Task can not be created.');
        },
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
                result[fieldSchema].push(schema.id);
              } else {
                result[fieldSchema] = [schema.id];
              }
            }
          } else if (field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) {
            const fieldEnum = field.source;
            if (result[fieldEnum]) {
              result[fieldEnum].push(schema.id);
            } else {
              result[fieldEnum] = [schema.id];
            }
          }
        }
      }
    }
    return result;
  }
}

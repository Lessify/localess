import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  model,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { Schema, SchemaCreate, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { AddDialogComponent } from './add-dialog/add-dialog.component';
import { AddDialogModel } from './add-dialog/add-dialog.model';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ExportDialogReturn } from './export-dialog/export-dialog.model';
import { ImportDialogReturn } from './import-dialog/import-dialog.model';
import { TaskService } from '@shared/services/task.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EditIdDialogComponent, EditIdDialogModel } from './edit-id-dialog';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';

@Component({
  selector: 'll-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemasComponent implements OnInit {
  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  // Inputs
  spaceId = input.required<string>();

  schemaTypeIcons: Record<SchemaType, string> = {
    ROOT: 'margin',
    NODE: 'polyline',
    ENUM: 'list',
  };

  dataSource: MatTableDataSource<Schema> = new MatTableDataSource<Schema>([]);
  displayedColumns: string[] = ['type', 'name', 'description', 'labels', /*'createdAt',*/ 'updatedAt', 'actions'];
  schemas = signal<Schema[]>([]);
  schemaIds = computed(() => this.schemas().map(it => it.id));
  schemasInUse = computed(() => this.inUseSchema(this.schemas()));

  private destroyRef = inject(DestroyRef);

  // Loading
  isLoading = true;

  // Filter
  currentLabel = model('');
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;
  allLabels = computed(() => {
    const tmp = this.schemas()
      .map(it => it.labels)
      .flat()
      .filter(it => it != undefined)
      .map(it => it!);
    return [...new Set<string>(tmp)];
  });
  filterLabels = signal<string[]>([]);
  filteredLabels = computed(() => {
    const currentLabel = this.currentLabel()?.toLowerCase() || '';
    return currentLabel
      ? this.allLabels()
          .filter(label => !this.filterLabels().includes(label))
          .filter(label => label.toLowerCase().includes(currentLabel))
      : this.allLabels().filter(label => !this.filterLabels().includes(label));
  });

  constructor(
    private readonly router: Router,
    private readonly schemaService: SchemaService,
    private readonly taskService: TaskService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadData(this.spaceId());
  }

  loadData(spaceId: string): void {
    this.schemaService
      .findAll(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: schemas => {
          this.schemas.set(schemas);
          this.dataSource.data = schemas;
          this.dataSource.filterPredicate = this.schemaFilterPredicate;
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  applyFilter(event: KeyboardEvent): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.toLowerCase();
  }

  schemaFilterPredicate(data: Schema, filter: string): boolean {
    if (data.id.toLowerCase().includes(filter)) {
      return true;
    }
    if (data.displayName?.toLowerCase().includes(filter)) {
      return true;
    }
    if (data.description?.toLowerCase().includes(filter)) {
      return true;
    }
    if (data.labels && data.labels.length > 0) {
      return data.labels.some(label => label.toLowerCase().includes(filter));
    }
    return false;
  }

  openAddDialog(): void {
    this.dialog
      .open<AddDialogComponent, AddDialogModel, SchemaCreate>(AddDialogComponent, {
        width: '500px',
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
        width: '500px',
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
          content: `Are you sure about deleting Schema with name '${element.id}'.`,
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
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createSchemaImportTask(this.spaceId(), it!.file)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema Import Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
        },
        error: () => {
          this.notificationService.error('Schema Import Task can not be created.');
        },
      });
  }

  openExportDialog() {
    this.dialog
      .open<ExportDialogComponent, void, ExportDialogReturn>(ExportDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.taskService.createSchemaExportTask(this.spaceId(), it?.fromDate)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema Export Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
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
            if (fieldEnum !== 'self') {
              if (result[fieldEnum]) {
                result[fieldEnum].push(schema.id);
              } else {
                result[fieldEnum] = [schema.id];
              }
            }
          }
        }
      }
    }
    return result;
  }
}

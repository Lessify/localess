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
import { Schema, SchemaCreate, SchemaType } from '@shared/models/schema.model';
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
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

type TableFilter = {
  labels?: string[];
};

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
    private readonly notificationService: NotificationService
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

  applyFilter(): void {
    const filter: TableFilter = {};
    if (this.filterLabels().length > 0) {
      filter.labels = this.filterLabels();
    }
    this.dataSource.filter = JSON.stringify(filter);
  }

  schemaFilterPredicate(data: Schema, filter: string): boolean {
    const tableFilter: TableFilter = JSON.parse(filter);
    if (tableFilter.labels && tableFilter.labels.length > 0) {
      return tableFilter.labels.every(label => data.labels?.includes(label));
    }
    return true;
  }

  removeLabel(label: string): void {
    this.filterLabels.update(it => {
      const idx = it.indexOf(label);
      if (idx < 0) {
        return it;
      }
      it.splice(idx, 1);
      return [...it];
    });
    this.applyFilter();
  }

  selectedLabel(event: MatAutocompleteSelectedEvent): void {
    const { option } = event;
    this.filterLabels.update(it => [...it, option.viewValue]);
    this.currentLabel.set('');
    option.deselect();
    this.applyFilter();
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
        switchMap(it => this.schemaService.create(this.spaceId(), it!))
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

  openEditIdDialog(element: Schema): void {
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
        switchMap(it => this.schemaService.updateId(this.spaceId(), element, it!))
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

  openEditDialog(element: Schema): void {
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
        switchMap(() => this.schemaService.delete(this.spaceId(), element.id))
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
        switchMap(it => this.taskService.createSchemaImportTask(this.spaceId(), it!.file))
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
        switchMap(it => this.taskService.createSchemaExportTask(this.spaceId(), it?.fromDate))
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
}

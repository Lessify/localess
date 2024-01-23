import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { SpaceService } from '@shared/services/space.service';
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
import { FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemasComponent implements OnInit {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  @Input({ required: true })
  spaceId!: string;

  schemaTypeIcons: Record<SchemaType, string> = {
    ROOT: 'margin',
    NODE: 'polyline',
  };

  dataSource: MatTableDataSource<Schema> = new MatTableDataSource<Schema>([]);
  displayedColumns: string[] = ['type', /*'previewImage',*/ 'name', 'createdAt', 'updatedAt', 'actions'];
  schemas: Schema[] = [];
  lockedByList?: Set<string>;

  // Form
  filter = this.fb.group({
    lockedBy: this.fb.control<string | undefined>(undefined),
  });

  private destroyRef = inject(DestroyRef);

  // Loading
  isLoading = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schemaService: SchemaService,
    private readonly taskService: TaskService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly fb: FormBuilder,
    private readonly store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.loadData(this.spaceId);
    this.filter.valueChanges.subscribe({
      next: value => {
        console.log(value);
        if (value.lockedBy) {
          this.dataSource.filter = JSON.stringify(value);
        } else {
          this.dataSource.filter = '';
        }
      },
    });
  }

  loadData(spaceId: string): void {
    this.schemaService
      .findAll(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: schemas => {
          this.schemas = schemas;
          // this.lockedByList = schemas.reduce((acc, item) => {
          //   if (item.lockedBy) {
          //     acc.add(item.lockedBy);
          //   }
          //   return acc;
          // }, new Set<string>());
          this.dataSource = new MatTableDataSource<Schema>(schemas);
          this.dataSource.filterPredicate = (data, filter) => {
            if (filter === '') return true;
            const filterValue = JSON.parse(filter);
            if (filterValue.lockedBy) {
              return data.lockedBy === filterValue.lockedBy;
            }
            return true;
          };
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  openAddDialog(): void {
    this.dialog
      .open<AddDialogComponent, AddDialogModel, SchemaCreate>(AddDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.schemas.map(it => it.name),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.schemaService.create(this.spaceId, it!))
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

  openEditDialog(element: Schema): void {
    this.router.navigate(['features', 'spaces', this.spaceId, 'schemas', element.id]);
  }

  openDeleteDialog(event: MouseEvent, element: Schema): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Schema',
          content: `Are you sure about deleting Schema with name '${element.name}'.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.schemaService.delete(this.spaceId, element.id))
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Schema '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Schema '${element.name}' can not be deleted.`);
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
        switchMap(it => this.taskService.createSchemaImportTask(this.spaceId, it!.file))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema Import Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId}/tasks`,
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
        switchMap(it => this.taskService.createSchemaExportTask(this.spaceId, it?.fromDate))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema Export Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId}/tasks`,
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

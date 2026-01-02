import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideCirclePlus,
  lucideCloudDownload,
  lucideEllipsisVertical,
  lucidePlus,
  lucideReplace,
  lucideSearch,
  lucideTrash,
  lucideUploadCloud,
} from '@ng-icons/lucide';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { Schema, SchemaCreate, SchemaFieldKind, SchemaType, schemaTypeDescriptions, sortSchema } from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { TaskService } from '@shared/services/task.service';
import { BrnPopoverImports } from '@spartan-ng/brain/popover';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { debounceTime } from 'rxjs';
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
    MatIconModule,
    CanUserPerformPipe,
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    HlmButtonImports,
    HlmIconImports,
    HlmDropdownMenuImports,
    HlmProgressImports,
    HlmTooltipImports,
    HlmBadgeImports,
    HlmButtonGroupImports,
    HlmCommandImports,
    HlmFieldImports,
    BrnPopoverImports,
    HlmPopoverImports,
    ReactiveFormsModule,
    HlmInputGroupImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEllipsisVertical,
      lucideCloudDownload,
      lucideUploadCloud,
      lucideTrash,
      lucideReplace,
      lucideSearch,
      lucideCirclePlus,
      lucideCheck,
    }),
  ],
})
export class SchemasComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly schemaService = inject(SchemaService);
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  // Inputs
  spaceId = input.required<string>();

  schemaTypeDescriptions = schemaTypeDescriptions;

  dataSource: MatTableDataSource<Schema> = new MatTableDataSource<Schema>([]);
  displayedColumns: string[] = ['type', 'name', 'description', 'labels', /*'createdAt',*/ 'updatedAt', 'actions'];
  schemas = signal<Schema[]>([]);
  schemaIds = computed(() => this.schemas().map(it => it.id));
  schemasInUse = computed(() => this.inUseSchema(this.schemas()));

  private destroyRef = inject(DestroyRef);

  // Loading
  isLoading = true;

  // Form
  filterForm = this.fb.group({
    search: this.fb.control<string>('', []),
    labels: this.fb.control<string[]>([], []),
  });

  //Labels
  allLabels = computed(() => {
    const tmp = this.schemas()
      .map(it => it.labels)
      .flat()
      .filter(it => it != undefined)
      .map(it => it!);
    return [...new Set<string>(tmp)];
  });

  ngOnInit(): void {
    this.loadData(this.spaceId());
    this.filterForm.valueChanges.pipe(debounceTime(500)).subscribe({
      next: value => {
        this.dataSource.filter = JSON.stringify(value);
      },
    });
  }

  loadData(spaceId: string): void {
    this.schemaService
      .findAll(spaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: schemas => {
          this.schemas.set(schemas.sort(sortSchema));
          this.dataSource.data = this.schemas();
          this.dataSource.filterPredicate = this.schemaFilterPredicate;
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  schemaFilterPredicate(data: Schema, filter: string): boolean {
    console.log('schemaFilterPredicate', filter);
    const { search, labels } = JSON.parse(filter);
    // if search is empty and no labels are selected, return true
    if ((!search || search.trim() === '') && (!labels || labels.length === 0)) {
      return true;
    }
    // if labels are selected, check if at least one label matches
    const matchSomeLabel = Array.isArray(labels) ? labels.some((label: string) => data.labels?.includes(label)) : undefined;
    if (labels && labels.length > 0 && !matchSomeLabel) {
      return false;
    }
    // if search is empty, return true (labels already matched)
    if (!search || search.trim() === '') {
      return true;
    }
    const searchLower = search.toLowerCase();
    if (data.id.toLowerCase().includes(searchLower)) {
      return true;
    }
    if (data.displayName?.toLowerCase().includes(searchLower)) {
      return true;
    }
    if (data.description?.toLowerCase().includes(searchLower)) {
      return true;
    }
    return false;
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
        panelClass: 'sm',
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

  selectLabel(label: string): void {
    const current = this.filterForm.controls.labels.value || [];
    if (current.includes(label)) {
      this.filterForm.controls.labels.setValue(current.filter(l => l !== label));
    } else {
      this.filterForm.controls.labels.setValue([...current, label]);
    }
  }
}

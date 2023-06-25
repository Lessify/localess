import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {selectSpace} from '@core/state/space/space.selector';
import {NotificationService} from '@shared/services/notification.service';
import {SchemaService} from '@shared/services/schema.service';
import {combineLatest, Subject} from 'rxjs';
import {ConfirmationDialogComponent} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {ConfirmationDialogModel} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {Schema, SchemaCreate} from '@shared/models/schema.model';
import {AddDialogComponent} from './add-dialog/add-dialog.component';
import {AddDialogModel} from './add-dialog/add-dialog.model';
import {saveAs} from "file-saver-es";
import {NameUtils} from "@core/utils/name-utils.service";
import {ExportDialogComponent} from "./export-dialog/export-dialog.component";
import {ImportDialogComponent} from "./import-dialog/import-dialog.component";
import {ExportDialogModel, ExportDialogReturn} from "./export-dialog/export-dialog.model";
import {ImportDialogModel, ImportDialogReturn} from "./import-dialog/import-dialog.model";

@Component({
  selector: 'll-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchemasComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  schemaTypeIcons: Record<string, string> = {
    'ROOT': 'margin',
    'NODE': 'polyline'
  }

  selectedSpace?: Space;
  dataSource: MatTableDataSource<Schema> = new MatTableDataSource<Schema>([]);
  displayedColumns: string[] = ['type', 'name', 'createdAt', 'updatedAt', 'actions'];
  schemas: Schema[] = [];

  // Subscriptions
  private destroy$ = new Subject();

  // Loading
  isLoading: boolean = true;
  isImportExportLoading: boolean = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schemaService: SchemaService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.schemaService.findAll(it.id)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, schemas]) => {
          this.selectedSpace = space
          this.schemas = schemas;
          this.dataSource = new MatTableDataSource<Schema>(schemas);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  openAddDialog(): void {
    this.dialog.open<AddDialogComponent, AddDialogModel, SchemaCreate>(
      AddDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.schemas.map(it => it.name)
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.schemaService.create(this.selectedSpace!.id, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schema has been created.');
        },
        error: () => {
          this.notificationService.error('Schema can not be created.');
        }
      });
  }

  onRowSelect(element: Schema): void {
    this.router.navigate(['features', 'schemas', element.id]);
  }

  openDeleteDialog(event: MouseEvent, element: Schema): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Schema',
          content: `Are you sure about deleting Schema with name '${element.name}'.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.schemaService.delete(this.selectedSpace!.id, element.id)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Schema '${element.name}' has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Schema '${element.name}' can not be deleted.`);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  openImportDialog() {
    this.isImportExportLoading = true;
    this.dialog
      .open<ImportDialogComponent, ImportDialogModel, ImportDialogReturn>(
        ImportDialogComponent,
        {
          width: '500px',
        }
      )
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.schemaService.import({
            spaceId: this.selectedSpace!.id,
            schemas: it!.schemas
          })
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schemas has been imported.');
        },
        error: () => {
          this.notificationService.error('Schemas can not be imported.');
        },
        complete: () => {
          setTimeout(() => {
            this.isImportExportLoading = false
            this.cd.markForCheck()
          }, 1000)
        }
      });
  }

  openExportDialog() {
    this.isImportExportLoading = true;
    let fileName = this.selectedSpace?.name || 'unknown'
    this.dialog
      .open<ExportDialogComponent, ExportDialogModel, ExportDialogReturn>(
        ExportDialogComponent,
        {
          width: '500px',
        }
      )
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.schemaService.export({
            spaceId: this.selectedSpace!.id,
            fromDate: it?.fromDate
          })
        )
      )
      .subscribe({
        next: (result) => {
          this.notificationService.success('Schemas has been exported.');
          saveAs(new Blob([JSON.stringify(result)], {type: "application/json"}), `${NameUtils.sanitize(fileName)}-${Date.now()}.schema.localess.json`)
        },
        error: () => {
          this.notificationService.error('Schemas can not be exported.');
        },
        complete: () => {
          setTimeout(() => {
            this.isImportExportLoading = false
            this.cd.markForCheck()
          }, 1000)
        }
      });
  }
}

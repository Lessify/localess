import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
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
import {
  Schematic,
  SchematicCreate,
  SchematicType,
  SchematicUpdate
} from '@shared/models/schematic.model';
import {SchematicService} from '@shared/services/schematic.service';
import {combineLatest, Subject} from 'rxjs';
import {SchematicAddDialogComponent} from './schematic-add-dialog/schematic-add-dialog.component';
import {
  ConfirmationDialogComponent
} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  ConfirmationDialogModel
} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {SchematicAddDialogModel} from './schematic-add-dialog/schematic-add-dialog.model';

@Component({
  selector: 'll-schematics',
  templateUrl: './schematics.component.html',
  styleUrls: ['./schematics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicsComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  schematicTypeIcons: Record<string, string> = {
    'ROOT': 'margin',
    'NODE': 'polyline'
  }

  isLoading: boolean = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<Schematic> = new MatTableDataSource<Schematic>([]);
  displayedColumns: string[] = ['type', 'name', 'createdAt', 'updatedAt', 'actions'];
  schematics: Schematic[] = [];

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schematicService: SchematicService,
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
            this.schematicService.findAll(it.id)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, schematics]) => {
          this.selectedSpace = space
          this.schematics = schematics;
          this.dataSource = new MatTableDataSource<Schematic>(schematics);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  openAddDialog(): void {
    this.dialog.open<SchematicAddDialogComponent, SchematicAddDialogModel, SchematicCreate>(
      SchematicAddDialogComponent, {
        width: '500px',
        data: {
          reservedNames: this.schematics.map( it => it.name)
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.schematicService.create(this.selectedSpace!.id, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schematic has been created.');
        },
        error: () => {
          this.notificationService.error('Schematic can not be created.');
        }
      });
  }

  onSchematicRowSelect(element: Schematic): void {
    this.router.navigate(['features', 'schematics', element.id]);
  }

  openDeleteDialog(element: Schematic): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Delete Schematic',
          content: `Are you sure about deleting Schematic with name '${element.name}'.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.schematicService.delete(this.selectedSpace!.id, element.id)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Schematic '${element.name}' has been deleted.`);
        },
        error: (err) => {
          this.notificationService.error(`Schematic '${element.name}' can not be deleted.`);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
}

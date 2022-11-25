import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatLegacyTableDataSource as MatTableDataSource} from '@angular/material/legacy-table';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
import {filter, switchMap} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {MatLegacyPaginator as MatPaginator} from '@angular/material/legacy-paginator';
import {Store} from '@ngrx/store';
import {AppState} from '../../core/state/core.state';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {selectSpace} from '../../core/state/space/space.selector';
import {NotificationService} from '@shared/services/notification.service';
import {
  Schematic,
  SchematicCreate,
  SchematicType,
  SchematicUpdate
} from '@shared/models/schematic.model';
import {SchematicService} from '@shared/services/schematic.service';
import {combineLatest} from 'rxjs';
import {SchematicAddDialogComponent} from './schematic-add-dialog/schematic-add-dialog.component';
import {
  ConfirmationDialogComponent
} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  ConfirmationDialogModel
} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {
  SchematicEditDialogComponent
} from './schematic-edit-dialog/schematic-edit-dialog.component';
import {SchematicEditDialogModel} from './schematic-edit-dialog/schematic-edit-dialog.model';
import {ObjectUtils} from '../../core/utils/object-utils.service';

@Component({
  selector: 'll-schematics',
  templateUrl: './schematics.component.html',
  styleUrls: ['./schematics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicsComponent implements OnInit {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  schematicTypeIcons : { [key: string]: string } = {
    'ROOT': 'margin',
    'NODE': 'polyline'
  }

  isLoading: boolean = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<Schematic> = new MatTableDataSource<Schematic>([]);
  displayedColumns: string[] = ['id', 'name', 'type', 'createdOn', 'updatedOn', 'actions'];
  schematics: Schematic[] = [];

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
        )
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
    this.dialog.open<SchematicAddDialogComponent, void, SchematicCreate>(
      SchematicAddDialogComponent, {
        width: '500px',
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

  openEditDialog(element: Schematic): void {
    this.dialog.open<SchematicEditDialogComponent, SchematicEditDialogModel, SchematicUpdate>(
      SchematicEditDialogComponent, {
        width: '1000px',
        data: {
          schematic: ObjectUtils.clone(element),
          schematics: this.schematics.filter( it => it.type === SchematicType.NODE)
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.schematicService.update(this.selectedSpace!.id, element.id, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Schematic has been updated.');
        },
        error: () => {
          this.notificationService.error('Schematic can not be updated.');
        }
      });
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
}

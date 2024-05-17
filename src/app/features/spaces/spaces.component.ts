import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, viewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs/operators';
import { SpaceDialogComponent } from './space-dialog/space-dialog.component';
import { SpaceDialogModel } from './space-dialog/space-dialog.model';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-spaces',
  templateUrl: './spaces.component.html',
  styleUrls: ['./spaces.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpacesComponent implements OnInit {
  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  isLoading = true;
  dataSource: MatTableDataSource<Space> = new MatTableDataSource<Space>([]);
  displayedColumns: string[] = ['id', 'name', /*'createdAt',*/ 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.spaceService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(response => {
        this.dataSource = new MatTableDataSource<Space>(response);
        this.dataSource.sort = this.sort();
        this.dataSource.paginator = this.paginator();
        this.isLoading = false;
        this.cd.markForCheck();
      });
  }

  openAddDialog(): void {
    this.dialog
      .open<SpaceDialogComponent, SpaceDialogModel, SpaceDialogModel>(SpaceDialogComponent, {
        width: '500px',
        data: {
          name: '',
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.spaceService.create(it!))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Space has been created.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Space can not be created.');
        },
      });
  }

  openEditDialog(element: Space): void {
    this.dialog
      .open<SpaceDialogComponent, SpaceDialogModel, SpaceDialogModel>(SpaceDialogComponent, {
        width: '500px',
        data: {
          name: element.name,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.spaceService.update(element.id, it!))
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Space has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Space can not be updated.');
        },
      });
  }

  openDeleteDialog(element: Space): void {
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Space',
          content: `Are you sure about deleting Space with name '${element.name}'.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.spaceService.delete(element.id))
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Space '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Space '${element.name}' can not be deleted.`);
        },
      });
  }
}

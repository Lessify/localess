import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { selectSpace } from '@core/state/space/space.selector';
import { NotificationService } from '@shared/services/notification.service';
import { combineLatest, Subject } from 'rxjs';
import { TokenDialogComponent } from './token-dialog/token-dialog.component';
import { TokenDialogModel } from './token-dialog/token-dialog.model';
import { Token } from '@shared/models/token.model';
import { TokenService } from '@shared/services/token.service';

@Component({
  selector: 'll-space-settings-tokens',
  templateUrl: './tokens.component.html',
  styleUrls: ['./tokens.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokensComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  isLoading = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<Token> = new MatTableDataSource<Token>([]);
  displayedColumns: string[] = ['id', 'name', 'createdAt', 'updatedAt', 'actions'];

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tokenService: TokenService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.store
      .select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it => combineLatest([this.spaceService.findById(it.id), this.tokenService.findAll(it.id)])),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ([space, tokens]) => {
          this.selectedSpace = space;
          this.dataSource = new MatTableDataSource<Token>(tokens);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  openAddDialog(): void {
    if (this.selectedSpace) {
      const spaceId = this.selectedSpace.id;
      this.dialog
        .open<TokenDialogComponent, never, TokenDialogModel>(TokenDialogComponent, {
          width: '500px',
        })
        .afterClosed()
        .pipe(
          filter(it => it !== undefined),
          switchMap(it => this.tokenService.create(spaceId, it!.name))
        )
        .subscribe({
          next: () => {
            this.notificationService.success('Token has been created.');
          },
          error: (err: unknown) => {
            console.error(err);
            this.notificationService.error('Token can not be created.');
          },
        });
    }
  }

  openDeleteDialog(element: Token): void {
    if (this.selectedSpace) {
      const spaceId = this.selectedSpace.id;
      this.dialog
        .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
          data: {
            title: 'Delete Token',
            content: `Are you sure about deleting Token with name '${element.name}'.`,
          },
        })
        .afterClosed()
        .pipe(
          filter(it => it || false),
          switchMap(() => this.tokenService.delete(spaceId, element.id))
        )
        .subscribe({
          next: () => {
            this.notificationService.success(`Token '${element.name}' has been deleted.`);
          },
          error: () => {
            this.notificationService.error(`Token '${element.name}' can not be deleted.`);
          },
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined);
    this.destroy$.complete();
  }
}

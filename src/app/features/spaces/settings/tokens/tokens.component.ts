import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { NotificationService } from '@shared/services/notification.service';
import { TokenDialogComponent } from './token-dialog/token-dialog.component';
import { TokenDialogModel } from './token-dialog/token-dialog.model';
import { Token } from '@shared/models/token.model';
import { TokenService } from '@shared/services/token.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SpaceStore } from '@shared/stores/space.store';

@Component({
  selector: 'll-space-settings-tokens',
  templateUrl: './tokens.component.html',
  styleUrls: ['./tokens.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokensComponent {
  sort = viewChild.required(MatSort);
  paginator = viewChild.required(MatPaginator);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  dataSource: MatTableDataSource<Token> = new MatTableDataSource<Token>([]);
  displayedColumns: string[] = ['id', 'name', 'createdAt', 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly tokenService: TokenService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
  ) {
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined), // Skip initial data
        switchMap(it => this.tokenService.findAll(it!.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: tokens => {
          this.dataSource = new MatTableDataSource<Token>(tokens);
          this.dataSource.sort = this.sort();
          this.dataSource.paginator = this.paginator();
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  openAddDialog(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    this.dialog
      .open<TokenDialogComponent, never, TokenDialogModel>(TokenDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.tokenService.create(spaceId!, it!.name)),
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

  openDeleteDialog(element: Token): void {
    const spaceId = this.spaceStore.selectedSpaceId();
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
        switchMap(() => this.tokenService.delete(spaceId!, element.id)),
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

import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmationDialogComponent, ConfirmationDialogModel } from '@shared/components/confirmation-dialog';
import { Token } from '@shared/models/token.model';
import { NotificationService } from '@shared/services/notification.service';
import { TokenService } from '@shared/services/token.service';
import { SpaceStore } from '@shared/stores/space.store';
import { filter, switchMap } from 'rxjs/operators';
import { TokenDialogComponent } from './token-dialog/token-dialog.component';
import { TokenDialogModel } from './token-dialog/token-dialog.model';

@Component({
  selector: 'll-space-settings-tokens',
  templateUrl: './tokens.component.html',
  styleUrls: ['./tokens.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    MatSortModule,
    ClipboardModule,
    MatTooltipModule,
    CommonModule,
    MatPaginatorModule,
  ],
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
        panelClass: 'sm',
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

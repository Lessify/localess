import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MeService } from '@shared/services/me.service';
import { NotificationService } from '@shared/services/notification.service';
import { UserStore } from '@shared/stores/user.store';
import { filter, switchMap } from 'rxjs/operators';
import { MeDialogComponent } from './me-dialog/me-dialog.component';
import { MeDialogModel } from './me-dialog/me-dialog.model';
import { MeEmailDialogComponent } from './me-email-dialog/me-email-dialog.component';
import { MeEmailDialogModel } from './me-email-dialog/me-email-dialog.model';
import { MePasswordDialogComponent } from './me-password-dialog/me-password-dialog.component';
import { MePasswordDialogModel } from './me-password-dialog/me-password-dialog.model';

@Component({
  selector: 'll-me',
  templateUrl: './me.component.html',
  styleUrls: ['./me.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatCardModule, CommonModule, MatDividerModule, MatButtonModule, NgOptimizedImage],
})
export class MeComponent {
  userStore = inject(UserStore);

  constructor(
    private readonly dialog: MatDialog,
    private readonly notificationService: NotificationService,
    private readonly meService: MeService,
  ) {}

  openEditDialog(): void {
    this.dialog
      .open<MeDialogComponent, MeDialogModel, MeDialogModel>(MeDialogComponent, {
        panelClass: 'sm',
        data: {
          displayName: this.userStore.displayName() || undefined,
          photoURL: this.userStore.photoURL() || undefined,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          //TODO handle firestore update
          this.meService.updateProfile(it!),
        ),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('User can not be updated.');
        },
      });
  }

  openUpdateEmailDialog(): void {
    this.dialog
      .open<MeEmailDialogComponent, void, MeEmailDialogModel>(MeEmailDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.meService.updateEmail(it!.newEmail)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User email has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('User email can not be updated.');
        },
      });
  }

  openUpdatePasswordDialog(): void {
    this.dialog
      .open<MePasswordDialogComponent, void, MePasswordDialogModel>(MePasswordDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.meService.updatePassword(it!.newPassword)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User password has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('User password can not be updated.');
        },
      });
  }
}

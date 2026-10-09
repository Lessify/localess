import { NgOptimizedImage, UpperCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';
import { UserStore } from '@core/stores/user.store';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { filter, switchMap, take } from 'rxjs/operators';

import { MeService } from './me.service';
import { MeDialogComponent } from './me-dialog/me-dialog.component';
import { MeDialogContext, MeDialogResult } from './me-dialog/me-dialog.model';
import { MeEmailDialogComponent } from './me-email-dialog/me-email-dialog.component';
import { MeEmailDialogResult } from './me-email-dialog/me-email-dialog.model';
import { MePasswordDialogComponent } from './me-password-dialog/me-password-dialog.component';
import { MePasswordDialogResult } from './me-password-dialog/me-password-dialog.model';

@Component({
  selector: 'll-me',
  templateUrl: './me.component.html',
  styleUrls: ['./me.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCardImports, HlmSeparatorImports, HlmButtonImports, NgOptimizedImage, UpperCasePipe],
})
export class MeComponent {
  private readonly dialog = inject(HlmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly meService = inject(MeService);

  userStore = inject(UserStore);

  openEditDialog(): void {
    this.dialog
      .open<MeDialogResult, MeDialogContext>(MeDialogComponent, {
        context: {
          displayName: this.userStore.displayName() || undefined,
          photoURL: this.userStore.photoURL() || undefined,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      // `closed$` does not complete the way `afterClosed()` did, hence `take(1)`.
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.meService.updateProfile(it!)),
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
      .open<MeEmailDialogResult>(MeEmailDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.meService.updateEmail(it!.newEmail, it!.currentPassword)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User email has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(currentPasswordError(err) ?? 'User email can not be updated.');
        },
      });
  }

  openUpdatePasswordDialog(): void {
    this.dialog
      .open<MePasswordDialogResult>(MePasswordDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.meService.updatePassword(it!.newPassword, it!.currentPassword)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User password has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(currentPasswordError(err) ?? 'User password can not be updated.');
        },
      });
  }
}

/** The server answers a wrong current password with 403 and a readable message. */
function currentPasswordError(err: unknown): string | undefined {
  if (err instanceof HttpErrorResponse && err.status === 403) {
    const message: unknown = err.error?.message;
    return typeof message === 'string' ? message : 'Current password is incorrect.';
  }
  return undefined;
}

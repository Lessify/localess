import { NgOptimizedImage, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { MeService } from '@shared/services/me.service';
import { NotificationService } from '@shared/services/notification.service';
import { UserStore } from '@shared/stores/user.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { filter, switchMap, take } from 'rxjs/operators';

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
      .open<MeEmailDialogResult>(MeEmailDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
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
      .open<MePasswordDialogResult>(MePasswordDialogComponent, {
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
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

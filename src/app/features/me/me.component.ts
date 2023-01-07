import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {Auth, user, User} from '@angular/fire/auth';

import {AppState} from '@core/state/core.state';
import {selectUser} from '@core/state/user/user.selector';
import {UserState} from '@core/state/user/user.model';
import {filter, switchMap} from 'rxjs/operators';
import {MeDialogComponent} from './me-dialog/me-dialog.component';
import {MeDialogModel} from './me-dialog/me-dialog.model';
import {MeService} from '@shared/services/me.service';
import {MePasswordDialogComponent} from './me-password-dialog/me-password-dialog.component';
import {MePasswordDialogModel} from './me-password-dialog/me-password-dialog.model';
import {MeEmailDialogComponent} from './me-email-dialog/me-email-dialog.component';
import {MeEmailDialogModel} from './me-email-dialog/me-email-dialog.model';
import {NotificationService} from '@shared/services/notification.service';

@Component({
  selector: 'll-me',
  templateUrl: './me.component.html',
  styleUrls: ['./me.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeComponent implements OnInit {

  isLoading: boolean = true;
  user?: UserState;
  authUser?: User | null;
  isPasswordProvider = false;
  isGoogleProvider = false;
  isMicrosoftProvider = false;
  numberProviders = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly auth: Auth,
    private readonly meService: MeService,
  ) {
  }

  ngOnInit(): void {
    this.store.select(selectUser)
      .subscribe((user) => {
        this.user = user;
        this.isLoading = false;
        this.cd.markForCheck();
      })
    user(this.auth)
      .subscribe((authUser) => {
        this.authUser = authUser;
        this.numberProviders = authUser?.providerData.length || 0;
        this.isPasswordProvider = authUser?.providerData.some(it => it.providerId === 'password') || false;
        this.isGoogleProvider = authUser?.providerData.some(it => it.providerId === 'google.com') || false;
        this.isMicrosoftProvider = authUser?.providerData.some(it => it.providerId === 'microsoft.com') || false;
        this.cd.markForCheck();
      })
  }

  openEditDialog(): void {
    this.dialog.open<MeDialogComponent, MeDialogModel, MeDialogModel>(
      MeDialogComponent, {
        width: '500px',
        data: {
          displayName: this.authUser?.displayName || undefined,
          photoURL: this.authUser?.photoURL || undefined
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          //TODO handle firestore update
          this.meService.updateProfile(this.authUser!, it!)
        ),
      )
      .subscribe({
          next: () => {
            this.notificationService.success('User has been updated.');
            this.authUser?.reload()
          },
          error: (err) => {
            this.notificationService.error('User can not be updated.');
          }
        }
      );
  }

  openUpdateEmailDialog(): void {
    this.dialog.open<MeEmailDialogComponent, void, MeEmailDialogModel>(
      MeEmailDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.meService.updateEmail(this.authUser!, it?.newEmail!)
        )
      )
      .subscribe({
          next: () => {
            this.notificationService.success('User email has been updated.');
            this.authUser?.reload()
          },
          error: (err) => {
            this.notificationService.error('User email can not be updated.');
          }
        }
      );
  }

  openUpdatePasswordDialog(): void {
    this.dialog.open<MePasswordDialogComponent, void, MePasswordDialogModel>(
      MePasswordDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.meService.updatePassword(this.authUser!, it?.newPassword!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success('User password has been updated.');
        },
        error: (err) => {
          this.notificationService.error('User password can not be updated.');
        }
      });
  }


}

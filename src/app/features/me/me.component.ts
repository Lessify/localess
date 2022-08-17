import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {Auth, updateProfile, user, User} from '@angular/fire/auth';

import {NotificationService} from '../../core/notifications/notification.service';
import {AppState} from '../../core/state/core.state';
import {selectUser} from '../../core/state/user/user.selector';
import {UserState} from '../../core/state/user/user.model';
import {filter, switchMap} from 'rxjs/operators';
import {MeDialogComponent} from './me-dialog/me-dialog.component';
import {MeDialogModel} from './me-dialog/me-dialog.model';
import {from} from 'rxjs';

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
    private readonly auth: Auth
  ) {
  }

  ngOnInit(): void {
    this.store.select(selectUser)
      .subscribe((user) => {
        this.user = user;
        this.isLoading = false;
        this.cd.detectChanges();
      })
    user(this.auth)
      .subscribe((authUser) => {
        this.authUser = authUser;
        this.numberProviders = authUser?.providerData.length || 0;
        this.isPasswordProvider = authUser?.providerData.some(it => it.providerId === 'password') || false;
        this.isGoogleProvider = authUser?.providerData.some(it => it.providerId === 'google.com') || false;
        this.isMicrosoftProvider = authUser?.providerData.some(it => it.providerId === 'microsoft.com') || false;
        this.cd.detectChanges();
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
          from(updateProfile(this.authUser!, {
            displayName: it?.displayName,
            photoURL: it?.photoURL
          }))
        )
      )
      .subscribe({
          next: (value) => {
            console.log(value)
            this.notificationService.success('User has been updated.');
          },
          error: (err) => {
            console.error(err)
            this.notificationService.error('User can not be updated.');
          }
        }
      );
  }

  openChangeEmailDialog(): void {

  }

  openChangePasswordDialog(): void {

  }
}

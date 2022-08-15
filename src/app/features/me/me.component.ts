import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {NotificationService} from '../../core/notifications/notification.service';
import {AppState} from '../../core/state/core.state';
import {UserService} from '../../shared/services/user.service';
import {selectUser} from '../../core/state/user/user.selector';
import {UserState} from '../../core/state/user/user.model';
import {Auth, authState, User} from '@angular/fire/auth';
import {filter, switchMap} from 'rxjs/operators';
import {MeDialogComponent} from './me-dialog/me-dialog.component';
import {MeDialogModel} from './me-dialog/me-dialog.model';

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


  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly userService: UserService,
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
    authState(this.auth)
      .subscribe((authUser) => {
        this.authUser = authUser;
      })
  }


  openEditDialog(): void {
    // this.dialog.open<MeDialogComponent, MeDialogModel, MeDialogModel>(
    //   MeDialogComponent, {
    //     width: '500px',
    //     data: {
    //       displayName: this.user?.displayName,
    //       photoURL: this.user?.photoURL
    //     }
    //   })
    //   .afterClosed()
    //   .pipe(
    //     filter(it => it !== undefined),
    //     switchMap(it =>
    //       this.userService.updateMe(this.user?.id!)
    //     )
    //   )
    //   .subscribe({
    //       next: (value) => {
    //         console.log(value)
    //         this.notificationService.success('User has been invited.');
    //       },
    //       error: (err) => {
    //         console.error(err)
    //         this.notificationService.error('User can not be invited.');
    //       }
    //     }
    //   );
  }
}

import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {UsersComponent} from './users.component';
import {UsersRoutingModule} from './users-routing.module';
import {UserService} from '@shared/services/user.service';
import {UserDialogComponent} from './user-dialog/user-dialog.component';
import {UserInviteDialogComponent} from './user-invite-dialog/user-invite-dialog.component';

@NgModule({
    declarations: [UsersComponent, UserDialogComponent, UserInviteDialogComponent],
  imports: [SharedModule, UsersRoutingModule],
    providers: [UserService]
})
export class UsersModule {
}

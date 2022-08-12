import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '../../shared/shared.module';
import {UsersComponent} from './users.component';
import {UsersRoutingModule} from './users-routing.module';
import {UserService} from '../../shared/services/user.service';
import {UserDialogComponent} from './user-dialog/user-dialog.component';

@NgModule({
    declarations: [UsersComponent, UserDialogComponent],
    imports: [CommonModule, SharedModule, UsersRoutingModule],
    providers: [UserService]
})
export class UsersModule {
}

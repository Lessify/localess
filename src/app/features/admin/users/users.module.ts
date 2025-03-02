import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { UsersRoutingModule } from './users-routing.module';
import { UserService } from '@shared/services/user.service';

@NgModule({
  declarations: [],
  imports: [SharedModule, UsersRoutingModule],
  providers: [UserService],
})
export class UsersModule {}

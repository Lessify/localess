import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SpaceService } from '@shared/services/space.service';

import { routs } from './auth.routs';

@NgModule({
  declarations: [],
  imports: [RouterModule.forChild(routs)],
  providers: [SpaceService],
  schemas: [],
})
export class AuthModule {}

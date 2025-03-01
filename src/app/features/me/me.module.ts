import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { MeRoutingModule } from './me-routing.module';
import { MeService } from '@shared/services/me.service';

@NgModule({
  declarations: [],
  imports: [SharedModule, MeRoutingModule],
  providers: [MeService],
})
export class MeModule {}

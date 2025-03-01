import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { SpaceService } from '@shared/services/space.service';

@NgModule({
  declarations: [],
  imports: [SharedModule, DashboardRoutingModule],
  providers: [SpaceService],
})
export class DashboardModule {
}

import { NgModule } from '@angular/core';
import { SpaceService } from '@shared/services/space.service';

import { FeaturesRoutingModule } from './features-routing.module';

@NgModule({
  declarations: [],
  imports: [FeaturesRoutingModule],
  providers: [SpaceService],
  schemas: [],
})
export class FeaturesModule {}

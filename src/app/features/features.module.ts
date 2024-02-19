import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { FeaturesRoutingModule } from './features-routing.module';
import { FeaturesComponent } from './features.component';
import { SharedModule } from '@shared/shared.module';
import { SpaceService } from '@shared/services/space.service';

@NgModule({
  declarations: [FeaturesComponent],
  imports: [SharedModule, FeaturesRoutingModule],
  providers: [SpaceService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FeaturesModule {}

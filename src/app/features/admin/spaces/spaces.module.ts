import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { SpacesRoutingModule } from './spaces-routing.module';
import { SpaceService } from '@shared/services/space.service';

@NgModule({
  declarations: [],
  imports: [SharedModule, SpacesRoutingModule],
  providers: [SpaceService],
})
export class SpacesModule {}

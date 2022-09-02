import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {FeaturesRoutingModule} from './features-routing.module';
import {FeaturesComponent} from './features.component';
import {SharedModule} from '@shared/shared.module';
import {SpaceService} from '@shared/services/space.service';

@NgModule({
  declarations: [FeaturesComponent],
  imports: [CommonModule, SharedModule, FeaturesRoutingModule],
  providers: [SpaceService]
})
export class FeaturesModule {}

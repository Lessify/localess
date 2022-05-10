import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FeaturesRoutingModule } from './features-routing.module';
import { FeaturesComponent } from './features.component';
import { SharedModule } from '../shared/shared.module';
import {SpacesService} from './spaces/spaces.service';

@NgModule({
  declarations: [FeaturesComponent],
  imports: [CommonModule, SharedModule, FeaturesRoutingModule],
  providers: [SpacesService]
})
export class FeaturesModule {}

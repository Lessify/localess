import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FeaturesRoutingModule } from './features-routing.module';
import { FeaturesComponent } from './features.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [FeaturesComponent],
  imports: [CommonModule, SharedModule, FeaturesRoutingModule]
})
export class FeaturesModule {}

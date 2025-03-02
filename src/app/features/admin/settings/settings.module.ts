import { NgModule } from '@angular/core';

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsService } from '@shared/services/settings.service';

@NgModule({
  declarations: [],
  imports: [SettingsRoutingModule],
  providers: [SettingsService],
})
export class SettingsModule {}

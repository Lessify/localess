import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { SettingsComponent } from './settings.component';
import { SettingsRoutingModule } from './settings-routing.module';
import { UiComponent } from './ui/ui.component';
import { SettingsService } from '@shared/services/settings.service';

@NgModule({
  declarations: [SettingsComponent, UiComponent],
  imports: [SharedModule, SettingsRoutingModule],
  providers: [SettingsService],
})
export class SettingsModule {}

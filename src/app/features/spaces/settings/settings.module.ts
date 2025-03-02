import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SpaceService } from '@shared/services/space.service';
import { LocaleService } from '@shared/services/locale.service';
import { TokenService } from '@shared/services/token.service';
import { MaterialService } from '@shared/services/material.service';

@NgModule({
  declarations: [],
  imports: [SharedModule, SettingsRoutingModule],
  providers: [SpaceService, LocaleService, TokenService, MaterialService],
})
export class SettingsModule {}

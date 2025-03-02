import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { PluginsRoutingModule } from './plugins-routing.module';
import { PluginService } from '@shared/services/plugin.service';

@NgModule({
  declarations: [],
  imports: [SharedModule, PluginsRoutingModule],
  providers: [PluginService],
})
export class PluginsModule {}

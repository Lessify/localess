import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { PluginsComponent } from './plugins.component';
import { PluginsRoutingModule } from './plugins-routing.module';
import { PluginService } from '@shared/services/plugin.service';
import { InstallDialogComponent } from './install-dialog/install-dialog.component';
import { ConfigDialogComponent } from './config-dialog/config-dialog.component';

@NgModule({
  declarations: [PluginsComponent, InstallDialogComponent, ConfigDialogComponent],
  imports: [SharedModule, PluginsRoutingModule],
  providers: [PluginService],
})
export class PluginsModule {}

import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {PluginsComponent} from './plugins.component';
import {PluginsRoutingModule} from './plugins-routing.module';
import {PluginService} from '@shared/services/plugin.service';
import {InstallDialogComponent} from "./install-dialog/install-dialog.component";

@NgModule({
    declarations: [PluginsComponent, InstallDialogComponent],
    imports: [SharedModule, PluginsRoutingModule],
    providers: [PluginService]
})
export class PluginsModule {
}

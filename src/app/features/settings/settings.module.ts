import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {SettingsComponent} from './settings.component';
import {SettingsRoutingModule} from './settings-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {LocalesComponent} from './locales/locales.component';
import {LocaleService} from '@shared/services/locale.service';
import {GeneralComponent} from "./general/general.component";
import {LocaleDialogComponent} from "./locales/locale-dialog/locale-dialog.component";
import {VisualEditorComponent} from "./visual-editor/visual-editor.component";

@NgModule({
    declarations: [SettingsComponent, LocalesComponent, GeneralComponent, LocaleDialogComponent, VisualEditorComponent],
    imports: [SharedModule, SettingsRoutingModule],
    providers: [SpaceService, LocaleService]
})
export class SettingsModule {
}

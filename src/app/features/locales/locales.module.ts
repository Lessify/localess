import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {LocalesComponent} from './locales.component';
import {LocalesRoutingModule} from './locales-routing.module';
import {LocaleDialogComponent} from './locale-dialog/locale-dialog.component';
import {LocaleService} from '@shared/services/locale.service';
import {SpaceService} from '@shared/services/space.service';

@NgModule({
    declarations: [LocalesComponent, LocaleDialogComponent],
    imports: [CommonModule, SharedModule, LocalesRoutingModule],
    providers: [LocaleService, SpaceService]
})
export class LocalesModule {
}

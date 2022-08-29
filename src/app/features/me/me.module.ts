import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '../../shared/shared.module';
import {MeComponent} from './me.component';
import {MeRoutingModule} from './me-routing.module';
import {MeDialogComponent} from './me-dialog/me-dialog.component';
import {MeService} from '../../shared/services/me.service';

@NgModule({
    declarations: [MeComponent, MeDialogComponent],
    imports: [CommonModule, SharedModule, MeRoutingModule],
    providers: [MeService]
})
export class MeModule {
}

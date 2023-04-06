import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {MeComponent} from './me.component';
import {MeRoutingModule} from './me-routing.module';
import {MeDialogComponent} from './me-dialog/me-dialog.component';
import {MeService} from '@shared/services/me.service';
import {MePasswordDialogComponent} from './me-password-dialog/me-password-dialog.component';
import {MeEmailDialogComponent} from './me-email-dialog/me-email-dialog.component';

@NgModule({
    declarations: [MeComponent, MeDialogComponent, MePasswordDialogComponent, MeEmailDialogComponent],
    imports: [SharedModule, MeRoutingModule],
    providers: [MeService]
})
export class MeModule {
}

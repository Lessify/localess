import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {SpacesComponent} from './spaces.component';
import {SpacesRoutingModule} from './spaces-routing.module';
import {SpaceDialogComponent} from './space-dialog/space-dialog.component';
import {SpaceService} from '@shared/services/space.service';

@NgModule({
    declarations: [SpacesComponent, SpaceDialogComponent],
    imports: [SharedModule, SpacesRoutingModule],
    providers: [SpaceService]
})
export class SpacesModule {
}

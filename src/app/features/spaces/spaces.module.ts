import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '../../shared/shared.module';
import {SpacesComponent} from './spaces.component';
import {SpacesRoutingModule} from './spaces-routing.module';
import {SpacesService} from './spaces.service';
import {SpaceDialogComponent} from './space-dialog/space-dialog.component';

@NgModule({
  declarations: [SpacesComponent, SpaceDialogComponent],
  imports: [CommonModule, SharedModule, SpacesRoutingModule],
  providers: [SpacesService],
  entryComponents: [SpaceDialogComponent]
})
export class SpacesModule {
}

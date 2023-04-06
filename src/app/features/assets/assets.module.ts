import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {AssetsComponent} from './assets.component';
import {AssetsRoutingModule} from './assets-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {AssetService} from '@shared/services/asset.service';
import {AddFolderDialogComponent} from './add-folder-dialog/add-folder-dialog.component';
import {EditFolderDialogComponent} from './edit-folder-dialog/edit-folder-dialog.component';


@NgModule({
  declarations: [
    AssetsComponent,
    AddFolderDialogComponent,
    EditFolderDialogComponent
  ],
  imports: [SharedModule, AssetsRoutingModule],
  providers: [SpaceService, AssetService]
})
export class AssetsModule {
}

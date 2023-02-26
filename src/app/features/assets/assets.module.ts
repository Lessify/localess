import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {AssetsComponent} from './assets.component';
import {AssetsRoutingModule} from './assets-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {AssetService} from '@shared/services/asset.service';
import {
  AssetFolderAddDialogComponent
} from './asset-folder-add-dialog/asset-folder-add-dialog.component';

@NgModule({
  declarations: [
    AssetsComponent,
    AssetFolderAddDialogComponent,
  ],
  imports: [CommonModule, SharedModule, AssetsRoutingModule],
  providers: [SpaceService, AssetService]
})
export class AssetsModule {
}

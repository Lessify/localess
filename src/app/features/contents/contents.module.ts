import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {ContentsComponent} from './contents.component';
import {ContentsRoutingModule} from './contents-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchematicService} from '@shared/services/schematic.service';
import {ContentService} from '@shared/services/content.service';
import {ContentEditDialogComponent} from './content-edit-dialog/content-edit-dialog.component';
import {PageDataEditComponent} from './page-data-edit/page-data-edit.component';
import {
  PageDataSchematicEditComponent
} from './page-data-schematic-edit/page-data-schematic-edit.component';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {LinkSelectComponent} from './link-select/link-select.component';
import {
  ContentPageAddDialogComponent
} from './content-page-add-dialog/content-page-add-dialog.component';
import {
  ContentFolderAddDialogComponent
} from './content-folder-add-dialog/content-folder-add-dialog.component';
import {AssetsSelectDialogComponent} from './assets-select-dialog/assets-select-dialog.component';
import {AssetsSelectComponent} from './assets-select/assets-select.component';
import {AssetService} from '@shared/services/asset.service';
import {AssetSelectComponent} from './asset-select/asset-select.component';

@NgModule({
  declarations: [
    ContentsComponent,
    ContentFolderAddDialogComponent,
    ContentPageAddDialogComponent,
    ContentEditDialogComponent,
    PageDataEditComponent,
    PageDataSchematicEditComponent,
    LinkSelectComponent,
    AssetSelectComponent,
    AssetsSelectComponent,
    AssetsSelectDialogComponent
  ],
  imports: [CommonModule, SharedModule, ContentsRoutingModule],
  providers: [SpaceService, SchematicService, ContentService, ContentHelperService, AssetService]
})
export class ContentsModule {
}

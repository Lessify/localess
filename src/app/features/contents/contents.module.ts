import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {ContentsComponent} from './contents.component';
import {ContentsRoutingModule} from './contents-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchemaService} from '@shared/services/schema.service';
import {ContentService} from '@shared/services/content.service';
import {PageDataEditComponent} from './page-data-edit/page-data-edit.component';
import {
  PageDataSchemaEditComponent
} from './page-data-schema-edit/page-data-schema-edit.component';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {LinkSelectComponent} from './link-select/link-select.component';
import {AssetsSelectDialogComponent} from './assets-select-dialog/assets-select-dialog.component';
import {AssetsSelectComponent} from './assets-select/assets-select.component';
import {AssetService} from '@shared/services/asset.service';
import {AssetSelectComponent} from './asset-select/asset-select.component';
import {AddDocumentDialogComponent} from './add-document-dialog/add-document-dialog.component';
import {AddFolderDialogComponent} from './add-folder-dialog/add-folder-dialog.component';
import {EditDialogComponent} from './edit-dialog/edit-dialog.component';

@NgModule({
  declarations: [
    ContentsComponent,
    AddFolderDialogComponent,
    AddDocumentDialogComponent,
    EditDialogComponent,
    PageDataEditComponent,
    PageDataSchemaEditComponent,
    LinkSelectComponent,
    AssetSelectComponent,
    AssetsSelectComponent,
    AssetsSelectDialogComponent
  ],
  imports: [CommonModule, SharedModule, ContentsRoutingModule],
  providers: [SpaceService, SchemaService, ContentService, ContentHelperService, AssetService]
})
export class ContentsModule {
}

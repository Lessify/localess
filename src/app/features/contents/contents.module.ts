import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {ContentsComponent} from './contents.component';
import {ContentsRoutingModule} from './contents-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchemaService} from '@shared/services/schema.service';
import {ContentService} from '@shared/services/content.service';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {AssetService} from '@shared/services/asset.service';
import {AddDocumentDialogComponent} from './add-document-dialog/add-document-dialog.component';
import {AddFolderDialogComponent} from './add-folder-dialog/add-folder-dialog.component';
import {EditDialogComponent} from './edit-dialog/edit-dialog.component';
import {EditDocumentComponent} from './edit-document/edit-document.component';
import {LinkSelectComponent} from './shared/link-select/link-select.component';
import {EditDocumentSchemaComponent} from './edit-document-schema/edit-document-schema.component';
import {AssetSelectComponent} from './shared/asset-select/asset-select.component';
import {AssetsSelectComponent} from './shared/assets-select/assets-select.component';
import {
  AssetsSelectDialogComponent
} from './shared/assets-select-dialog/assets-select-dialog.component';

@NgModule({
  declarations: [
    ContentsComponent,
    AddFolderDialogComponent,
    AddDocumentDialogComponent,
    EditDialogComponent,
    EditDocumentComponent,
    EditDocumentSchemaComponent,
    LinkSelectComponent,
    AssetSelectComponent,
    AssetsSelectComponent,
    AssetsSelectDialogComponent
  ],
  imports: [SharedModule, ContentsRoutingModule],
  providers: [SpaceService, SchemaService, ContentService, ContentHelperService, AssetService]
})
export class ContentsModule {
}

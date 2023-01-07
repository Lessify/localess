import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {ContentsComponent} from './contents.component';
import {ContentsRoutingModule} from './contents-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchematicService} from '@shared/services/schematic.service';
import {ContentService} from '@shared/services/content.service';
import {PageAddDialogComponent} from './page-add-dialog/page-add-dialog.component';
import {ContentEditDialogComponent} from './content-edit-dialog/content-edit-dialog.component';
import {PageDataEditComponent} from './page-data-edit/page-data-edit.component';
import {
  PageDataSchematicEditComponent
} from './page-data-schematic-edit/page-data-schematic-edit.component';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {FolderAddDialogComponent} from './folder-add-dialog/folder-add-dialog.component';

@NgModule({
  declarations: [
    FolderAddDialogComponent,
    ContentsComponent,
    PageAddDialogComponent,
    ContentEditDialogComponent,
    PageDataEditComponent,
    PageDataSchematicEditComponent
  ],
  imports: [CommonModule, SharedModule, ContentsRoutingModule],
  providers: [SpaceService, SchematicService, ContentService, ContentHelperService]
})
export class ContentsModule {
}

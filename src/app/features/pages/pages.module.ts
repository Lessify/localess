import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {PagesComponent} from './pages.component';
import {PagesRoutingModule} from './pages-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchematicService} from '@shared/services/schematic.service';
import {PageService} from '@shared/services/page.service';
import {PageAddDialogComponent} from './page-add-dialog/page-add-dialog.component';
import {PageEditDialogComponent} from './page-edit-dialog/page-edit-dialog.component';
import {PageContentEditComponent} from './page-content-edit/page-content-edit.component';
import {
  PageContentSchematicEditComponent
} from './page-content-schematic-edit/page-content-schematic-edit.component';
import {ContentService} from '@shared/services/content.service';

@NgModule({
  declarations: [
    PagesComponent,
    PageAddDialogComponent,
    PageEditDialogComponent,
    PageContentEditComponent,
    PageContentSchematicEditComponent
  ],
  imports: [CommonModule, SharedModule, PagesRoutingModule],
  providers: [SpaceService, SchematicService, PageService, ContentService]
})
export class PagesModule {
}

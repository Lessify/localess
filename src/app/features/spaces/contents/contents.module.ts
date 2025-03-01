import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { ContentsRoutingModule } from './contents-routing.module';
import { SpaceService } from '@shared/services/space.service';
import { SchemaService } from '@shared/services/schema.service';
import { ContentService } from '@shared/services/content.service';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { AssetService } from '@shared/services/asset.service';
import { AddDocumentDialogComponent } from './add-document-dialog';
import { AddFolderDialogComponent } from './add-folder-dialog';
import { EditDialogComponent } from './edit-dialog';
import { EditDocumentComponent } from './edit-document/edit-document.component';
import { LinkSelectComponent } from './shared/link-select/link-select.component';
import { EditDocumentSchemaComponent } from './edit-document-schema/edit-document-schema.component';
import { AssetSelectComponent } from './shared/asset-select/asset-select.component';
import { AssetsSelectComponent } from './shared/assets-select/assets-select.component';
import { ExportDialogComponent } from './export-dialog';
import { ImportDialogComponent } from './import-dialog';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { ReferenceSelectComponent } from './shared/reference-select/reference-select.component';
import { ReferencesSelectComponent } from './shared/references-select/references-select.component';
import { ContentHistoryService } from '@shared/services/content-history.service';
import { MarkdownModule } from 'ngx-markdown';
import { MoveDialogComponent } from './move-dialog';
import { StatusComponent } from '@shared/components/status';
import { TranslateService } from '@shared/services/translate.service';
import { NgxTiptapModule } from 'ngx-tiptap';
import { RichTextEditorComponent } from './shared/rich-text-editor/rich-text-editor.component';
import { BreadcrumbComponent, BreadcrumbItemComponent } from '@shared/components/breadcrumb';

@NgModule({
  declarations: [
    AddFolderDialogComponent,
    AddDocumentDialogComponent,
    EditDialogComponent,
    EditDocumentComponent,
    EditDocumentSchemaComponent,
    LinkSelectComponent,
    ReferenceSelectComponent,
    ReferencesSelectComponent,
    AssetSelectComponent,
    AssetsSelectComponent,
    ExportDialogComponent,
    ImportDialogComponent,
    MoveDialogComponent,
    RichTextEditorComponent,
  ],
  imports: [SharedModule, ContentsRoutingModule, MarkdownModule.forChild(), StatusComponent, NgxTiptapModule, BreadcrumbComponent, BreadcrumbItemComponent],
  providers: [
    SpaceService,
    SchemaService,
    ContentService,
    ContentHistoryService,
    ContentHelperService,
    AssetService,
    TaskService,
    TokenService,
    TranslateService,
  ],
})
export class ContentsModule {
}

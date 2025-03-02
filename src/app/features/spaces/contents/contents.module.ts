import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { ContentsRoutingModule } from './contents-routing.module';
import { SpaceService } from '@shared/services/space.service';
import { SchemaService } from '@shared/services/schema.service';
import { ContentService } from '@shared/services/content.service';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { AssetService } from '@shared/services/asset.service';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { ContentHistoryService } from '@shared/services/content-history.service';
import { MarkdownModule } from 'ngx-markdown';
import { StatusComponent } from '@shared/components/status';
import { TranslateService } from '@shared/services/translate.service';
import { NgxTiptapModule } from 'ngx-tiptap';
import { BreadcrumbComponent, BreadcrumbItemComponent } from '@shared/components/breadcrumb';

@NgModule({
  declarations: [],
  imports: [
    SharedModule,
    ContentsRoutingModule,
    MarkdownModule.forChild(),
    StatusComponent,
    NgxTiptapModule,
    BreadcrumbComponent,
    BreadcrumbItemComponent,
  ],
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
export class ContentsModule {}

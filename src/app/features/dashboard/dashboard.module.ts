import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { TranslationService } from '@shared/services/translation.service';
import { SchemaService } from '@shared/services/schema.service';
import { AssetService } from '@shared/services/asset.service';
import { ContentService } from '@shared/services/content.service';
import { ContentHelperService } from '@shared/services/content-helper.service';

@NgModule({
  declarations: [DashboardComponent],
  imports: [SharedModule, DashboardRoutingModule],
  providers: [TranslationService, SchemaService, AssetService, ContentService, ContentHelperService],
})
export class DashboardModule {}

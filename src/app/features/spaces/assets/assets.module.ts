import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { AssetsRoutingModule } from './assets-routing.module';
import { SpaceService } from '@shared/services/space.service';
import { AssetService } from '@shared/services/asset.service';
import { TaskService } from '@shared/services/task.service';
import { UnsplashPluginService } from '@shared/services/unsplash-plugin.service';
import { BreadcrumbComponent, BreadcrumbItemComponent } from '@shared/components/breadcrumb';

@NgModule({
  declarations: [],
  imports: [SharedModule, AssetsRoutingModule, BreadcrumbComponent, BreadcrumbItemComponent],
  providers: [SpaceService, AssetService, TaskService, UnsplashPluginService],
})
export class AssetsModule {
}

import { NgModule } from '@angular/core';

import { SchemasRoutingModule } from './schemas-routing.module';
import { SpaceService } from '@shared/services/space.service';
import { SchemaService } from '@shared/services/schema.service';
import { TaskService } from '@shared/services/task.service';
import { AssetService } from '@shared/services/asset.service';

@NgModule({
  declarations: [],
  imports: [SchemasRoutingModule],
  providers: [SpaceService, SchemaService, TaskService, AssetService],
  exports: [],
})
export class SchemasModule {}

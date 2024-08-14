import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { OpenApiComponent } from './open-api.component';
import { OpenApiRoutingModule } from './open-api-routing.module';
import { OpenApiService } from '@shared/services/open-api.service';

@NgModule({
  declarations: [OpenApiComponent],
  imports: [SharedModule, OpenApiRoutingModule],
  providers: [OpenApiService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OpenApiModule {}

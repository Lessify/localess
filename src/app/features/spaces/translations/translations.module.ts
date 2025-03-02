import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { TranslationsRoutingModule } from './translations-routing.module';
import { TranslationService } from '@shared/services/translation.service';
import { TranslateService } from '@shared/services/translate.service';
import { LocaleService } from '@shared/services/locale.service';
import { TaskService } from '@shared/services/task.service';
import { TranslationHistoryService } from '@shared/services/translation-history.service';
import { StatusComponent } from '@shared/components/status';

@NgModule({
  declarations: [],
  imports: [SharedModule, TranslationsRoutingModule, StatusComponent],
  providers: [TranslationService, TranslationHistoryService, TranslateService, LocaleService, TaskService],
})
export class TranslationsModule {}

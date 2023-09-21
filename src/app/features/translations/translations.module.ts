import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { TranslationsRoutingModule } from './translations-routing.module';
import { TranslationService } from '@shared/services/translation.service';
import { TranslationsComponent } from './translations.component';
import { TranslationStringViewComponent } from './translation-string-view/translation-string-view.component';
import { TranslationStringEditComponent } from './translation-string-edit/translation-string-edit.component';
import { TranslationAddDialogComponent } from './translation-add-dialog/translation-add-dialog.component';
import { TranslationEditDialogComponent } from './translation-edit-dialog/translation-edit-dialog.component';
import { TranslationArrayEditComponent } from './translation-array-edit/translation-array-edit.component';
import { TranslationArrayViewComponent } from './translation-array-view/translation-array-view.component';
import { TranslationPluralEditComponent } from './translation-plural-edit/translation-plural-edit.component';
import { TranslationPluralViewComponent } from './translation-plural-view/translation-plural-view.component';
import { TranslateService } from '@shared/services/translate.service';
import { LocaleService } from '@shared/services/locale.service';
import { TaskService } from '@shared/services/task.service';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';

@NgModule({
  declarations: [
    TranslationsComponent,
    TranslationArrayEditComponent,
    TranslationArrayViewComponent,
    TranslationPluralEditComponent,
    TranslationPluralViewComponent,
    TranslationStringEditComponent,
    TranslationStringViewComponent,
    TranslationAddDialogComponent,
    TranslationEditDialogComponent,
    ExportDialogComponent,
    ImportDialogComponent,
  ],
  imports: [SharedModule, TranslationsRoutingModule],
  providers: [TranslationService, TranslateService, LocaleService, TaskService],
})
export class TranslationsModule {}

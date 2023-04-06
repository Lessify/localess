import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {TranslationsRoutingModule} from './translations-routing.module';
import {TranslationService} from '@shared/services/translation.service';
import {TranslationsComponent} from './translations.component';
import {
  TranslationStringViewComponent
} from './translation-string-view/translation-string-view.component';
import {
  TranslationStringEditComponent
} from './translation-string-edit/translation-string-edit.component';
import {
  TranslationAddDialogComponent
} from './translation-add-dialog/translation-add-dialog.component';
import {
  TranslationEditDialogComponent
} from './translation-edit-dialog/translation-edit-dialog.component';
import {
  TranslationArrayEditComponent
} from './translation-array-edit/translation-array-edit.component';
import {
  TranslationArrayViewComponent
} from './translation-array-view/translation-array-view.component';
import {
  TranslationPluralEditComponent
} from './translation-plural-edit/translation-plural-edit.component';
import {
  TranslationPluralViewComponent
} from './translation-plural-view/translation-plural-view.component';
import {
  TranslationExportDialogComponent
} from './translation-export-dialog/translation-export-dialog.component';
import {
  TranslationImportDialogComponent
} from './translation-import-dialog/translation-import-dialog.component';
import {TranslateService} from '@shared/services/translate.service';
import {LocaleService} from '@shared/services/locale.service';


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
    TranslationExportDialogComponent,
    TranslationImportDialogComponent
  ],
  imports: [SharedModule, TranslationsRoutingModule],
  providers: [TranslationService, TranslateService, LocaleService]
})
export class TranslationsModule {
}

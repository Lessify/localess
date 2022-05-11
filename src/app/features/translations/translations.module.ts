import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '../../shared/shared.module';
import {TranslationsRoutingModule} from './translations-routing.module';
import {TranslationService} from '../../shared/services/translation.service';
import {TranslationsComponent} from './translations.component';
import {
  TranslationStringViewComponent
} from './translation-string-view/translation-string-view.component';
import {
  TranslationStringEditComponent
} from './translation-string-edit/translation-string-edit.component';


@NgModule({
  declarations: [TranslationsComponent, TranslationStringViewComponent, TranslationStringEditComponent],
  imports: [CommonModule, SharedModule, TranslationsRoutingModule],
  providers: [TranslationService],
  entryComponents: []
})
export class TranslationsModule {
}

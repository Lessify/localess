import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '../../shared/shared.module';
import {TranslatesComponent} from './translates.component';
import {TranslatesRoutingModule} from './translates-routing.module';
import {TranslatesService} from './translates.service';
import {TranslateDialogComponent} from './translate-dialog/translate-dialog.component';

@NgModule({
  declarations: [TranslatesComponent, TranslateDialogComponent],
  imports: [CommonModule, SharedModule, TranslatesRoutingModule],
  providers: [TranslatesService],
  entryComponents: [TranslateDialogComponent]
})
export class TranslatesModule {
}

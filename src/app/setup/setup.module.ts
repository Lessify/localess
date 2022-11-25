import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SetupRoutingModule} from './setup-routing.module';
import {SetupComponent} from './setup.component';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {ReactiveFormsModule} from '@angular/forms';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {SetupService} from './setup.service';

@NgModule({
  declarations: [SetupComponent],
  imports: [
    CommonModule,
    SetupRoutingModule,

    //Components
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  providers: [SetupService]
})
export class SetupModule {}

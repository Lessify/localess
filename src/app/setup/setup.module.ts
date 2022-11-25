import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SetupRoutingModule} from './setup-routing.module';
import {SetupComponent} from './setup.component';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
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

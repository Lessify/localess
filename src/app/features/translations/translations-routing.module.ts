import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslationsComponent } from './translations.component';

const routes: Routes = [
  {
    path: '',
    component: TranslationsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TranslationsRoutingModule {}

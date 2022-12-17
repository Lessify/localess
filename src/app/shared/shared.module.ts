import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatSelectModule} from '@angular/material/select';
import {MatTabsModule} from '@angular/material/tabs';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatChipsModule} from '@angular/material/chips';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatCardModule} from '@angular/material/card';
import {MatListModule} from '@angular/material/list';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatDividerModule} from '@angular/material/divider';
import {MatSliderModule} from '@angular/material/slider';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule, MatRippleModule} from '@angular/material/core';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSortModule} from '@angular/material/sort';
import {MatDialogModule} from '@angular/material/dialog';
import {
  ConfirmationDialogComponent
} from './components/confirmation-dialog/confirmation-dialog.component';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {MatGridListModule} from '@angular/material/grid-list';
import {TranslationFilterPipe} from './pipes/translation-filter.pipe';
import {IconComponent} from './components/icon/icon.component';
import {HasAnyUserRolePipe} from './pipes/has-any-user-role.pipe';
import {
  CustomSnackBarComponent
} from '@shared/components/custom-snack-bar/custom-snack-bar.component';
import {RouterLink} from '@angular/router';
import {BreadcrumbComponent} from '@shared/components/breadcrumb/breadcrumb.component';
import {BreadcrumbItemComponent} from '@shared/components/breadcrumb/breadcrumb-item.component';
import {ClipboardModule} from '@angular/cdk/clipboard';

const MATERIAL_MODULES: any[] = [
  MatSidenavModule,
  MatButtonModule,
  MatMenuModule,
  MatTabsModule,
  MatChipsModule,
  MatInputModule,
  MatProgressSpinnerModule,
  MatCheckboxModule,
  MatCardModule,
  MatListModule,
  MatSelectModule,
  MatIconModule,
  MatTooltipModule,
  MatSnackBarModule,
  MatSlideToggleModule,
  MatDividerModule,
  MatSliderModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatToolbarModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatDialogModule,
  MatRippleModule,
  MatProgressBarModule,
  MatAutocompleteModule,
  ScrollingModule,
  MatGridListModule,
  MatSnackBarModule,
  ClipboardModule
];

const SHARED_PIPES: any[] = [
  TranslationFilterPipe,
  HasAnyUserRolePipe
]

const SHARED_COMPONENTS: any[] = [
  BreadcrumbComponent,
  BreadcrumbItemComponent,
  ConfirmationDialogComponent,
  CustomSnackBarComponent,
  IconComponent,
]

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MATERIAL_MODULES,
    RouterLink,
  ],
  declarations: [
    SHARED_COMPONENTS,
    SHARED_PIPES
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MATERIAL_MODULES,
    SHARED_COMPONENTS,
    SHARED_PIPES
  ],
  providers: []
})
export class SharedModule {
}

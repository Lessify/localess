import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyMenuModule as MatMenuModule} from '@angular/material/legacy-menu';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacyTabsModule as MatTabsModule} from '@angular/material/legacy-tabs';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {MatLegacyChipsModule as MatChipsModule} from '@angular/material/legacy-chips';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatLegacySlideToggleModule as MatSlideToggleModule} from '@angular/material/legacy-slide-toggle';
import {MatDividerModule} from '@angular/material/divider';
import {MatLegacySliderModule as MatSliderModule} from '@angular/material/legacy-slider';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule, MatRippleModule} from '@angular/material/core';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {MatLegacyPaginatorModule as MatPaginatorModule} from '@angular/material/legacy-paginator';
import {MatSortModule} from '@angular/material/sort';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {
  ConfirmationDialogComponent
} from './components/confirmation-dialog/confirmation-dialog.component';
import {MatLegacyProgressBarModule as MatProgressBarModule} from '@angular/material/legacy-progress-bar';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from '@angular/material/legacy-autocomplete';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {CopierService} from './services/copier.service';
import {MatGridListModule} from '@angular/material/grid-list';
import {TranslationFilterPipe} from './pipes/translation-filter.pipe';
import {IconComponent} from './components/icon/icon.component';
import {HasAnyUserRolePipe} from './pipes/has-any-user-role.pipe';
import {CustomSnackBarComponent} from '@shared/components/custom-snack-bar/custom-snack-bar.component';
import {RouterLink} from '@angular/router';

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
  MatSnackBarModule
];

const SHARED_PIPES: any[] = [
  TranslationFilterPipe,
  HasAnyUserRolePipe
]

const SHARED_COMPONENTS: any[] = [
  ConfirmationDialogComponent,
  IconComponent,
  CustomSnackBarComponent
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
  providers: [CopierService]
})
export class SharedModule {
}

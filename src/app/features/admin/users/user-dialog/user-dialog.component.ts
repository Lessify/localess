import { ChangeDetectionStrategy, Component, inject, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserDialogModel } from './user-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { MatFormField } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { MatListModule, MatSelectionList } from '@angular/material/list';
import { MatDivider } from '@angular/material/divider';
import { MatButton } from '@angular/material/button';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'll-user-dialog',
  standalone: true,
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormField,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MatTooltip,
    MatSelectionList,
    MatListModule,
    MatDivider,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    JsonPipe,
  ],
})
export class UserDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    role: this.fb.control<string | undefined>(undefined),
    permissions: this.fb.control<string[] | undefined>(undefined),
    lock: this.fb.control<boolean | undefined>(undefined),
  });

  settingsStore = inject(LocalSettingsStore);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogModel,
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}

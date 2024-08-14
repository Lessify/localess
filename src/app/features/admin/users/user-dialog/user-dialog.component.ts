import { ChangeDetectionStrategy, Component, inject, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserDialogModel } from './user-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/store/local-settings.store';

@Component({
  selector: 'll-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    role: this.fb.control<string | undefined>(undefined),
    permissions: this.fb.control<string[] | undefined>(undefined),
  });

  settingsStore = inject(LocalSettingsStore);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogModel,
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserInviteDialogModel } from './user-invite-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { selectSettings } from '@core/state/settings/settings.selectors';

@Component({
  selector: 'll-user-invite-dialog',
  templateUrl: './user-invite-dialog.component.html',
  styleUrls: ['./user-invite-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInviteDialogComponent {
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    displayName: this.fb.control('', [Validators.minLength(2)]),
    role: this.fb.control(undefined),
    permissions: this.fb.control(undefined),
  });

  // Subscriptions
  settings$ = this.store.select(selectSettings);

  constructor(
    private readonly store: Store<AppState>,
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: UserInviteDialogModel
  ) {}
}

import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {UserInviteDialogModel} from './user-invite-dialog.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-user-invite-dialog',
  templateUrl: './user-invite-dialog.component.html',
  styleUrls: ['./user-invite-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserInviteDialogComponent {

  roles = ['admin', 'write', 'edit', 'read', 'none']

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    role: this.fb.control('none', Validators.required),
    displayName: this.fb.control('', [Validators.minLength(2)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: UserInviteDialogModel
  ) {
  }
}

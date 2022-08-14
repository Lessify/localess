import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {UserInviteDialogModel} from './user-invite-dialog.model';

@Component({
  selector: 'll-user-invite-dialog',
  templateUrl: './user-invite-dialog.component.html',
  styleUrls: ['./user-invite-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserInviteDialogComponent implements OnInit {

  roles = ['admin', 'write', 'read', 'none']

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.minLength(6)]),
    role: this.fb.control('none', Validators.required)
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: UserInviteDialogModel
  ) {
  }

  ngOnInit(): void {

  }
}

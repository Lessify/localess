import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {UserDialogModel} from './user-dialog.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDialogComponent implements OnInit {

  roles = ['admin', 'write', 'edit', 'read', 'none']

  form: FormGroup = this.fb.group({
    role: this.fb.control('none', Validators.required)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}

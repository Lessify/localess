import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {TokenValidator} from '@shared/validators/token.validator';

@Component({
  selector: 'll-token-dialog',
  templateUrl: './token-dialog.component.html',
  styleUrls: ['./token-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TokenDialogComponent {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', TokenValidator.NAME)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }
}

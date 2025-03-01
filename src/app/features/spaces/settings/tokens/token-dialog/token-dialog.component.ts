import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { TokenValidator } from '@shared/validators/token.validator';
import { MatFormField } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';

@Component({
  selector: 'll-token-dialog',
  standalone: true,
  templateUrl: './token-dialog.component.html',
  styleUrls: ['./token-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormField,
    MatButton,
    MatInput,
  ],
})
export class TokenDialogComponent {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', TokenValidator.NAME),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}
}

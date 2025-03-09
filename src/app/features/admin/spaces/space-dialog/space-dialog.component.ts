import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceValidator } from '@shared/validators/space.validator';
import { SpaceDialogModel } from './space-dialog.model';

@Component({
  selector: 'll-space-dialog',
  standalone: true,
  templateUrl: './space-dialog.component.html',
  styleUrls: ['./space-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class SpaceDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: SpaceDialogModel,
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}

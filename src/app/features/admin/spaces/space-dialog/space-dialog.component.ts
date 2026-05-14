import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceValidator } from '@shared/validators/space.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { SpaceDialogModel } from './space-dialog.model';

@Component({
  selector: 'll-space-dialog',
  templateUrl: './space-dialog.component.html',
  styleUrls: ['./space-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmInputImports],
})
export class SpaceDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<SpaceDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
  });

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}

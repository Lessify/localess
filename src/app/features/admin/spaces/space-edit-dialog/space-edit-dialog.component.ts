import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceValidator } from '@shared/validators/space.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { SpaceEditDialogModel } from './space-edit-dialog.model';

/** Renaming an existing space. Templates apply to new spaces only, so there is no picker here. */
@Component({
  selector: 'll-space-edit-dialog',
  templateUrl: './space-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmInputGroupImports],
})
export class SpaceEditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<SpaceEditDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
  });

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue({ name: this.data.name });
    }
  }
}

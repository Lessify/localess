import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { MeDialogModel } from './me-dialog.model';

@Component({
  selector: 'll-me-dialog',
  templateUrl: './me-dialog.component.html',
  styleUrls: ['./me-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmFieldImports, HlmInputImports, HlmButtonImports],
})
export class MeDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  data = inject<MeDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    displayName: this.fb.control(undefined),
    photoURL: this.fb.control(undefined),
  });

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}

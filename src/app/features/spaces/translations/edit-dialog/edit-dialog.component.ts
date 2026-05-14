import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleX } from '@ng-icons/lucide';
import { Translation } from '@shared/models/translation.model';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

@Component({
  selector: 'll-translation-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  styleUrls: ['./edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports, HlmInputImports],
  providers: [provideIcons({ lucideCircleX })],
})
export class EditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<Translation>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    description: this.fb.control('', TranslationValidator.DESCRIPTION),
    labels: this.fb.control([], TranslationValidator.DESCRIPTION),
  });

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }

  addLabel(value: string): void {
    if (value.trim()) {
      const labels: string[] = this.form.controls['labels'].value;
      if (labels instanceof Array) {
        this.form.controls['labels'].setValue([...labels, value.trim()]);
      } else {
        this.form.controls['labels'].setValue([value.trim()]);
      }
    }
  }

  removeLabel(label: string): void {
    const labels: string[] = this.form.controls['labels'].value;
    if (labels instanceof Array) {
      this.form.controls['labels'].setValue(labels.filter(l => l !== label));
    }
  }
}

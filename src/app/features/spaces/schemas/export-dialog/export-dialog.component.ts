import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideCloudDownload, lucideX })],
})
export class ExportDialogComponent {
  private readonly fb = inject(FormBuilder);

  todayIso = new Date().toISOString().split('T')[0];

  form: FormGroup = this.fb.group({
    fromDate: this.fb.control(undefined),
  });

  dateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.controls['fromDate'].setValue(value ? new Date(value).getTime() : undefined);
  }

  clearDate(input: HTMLInputElement): void {
    input.value = '';
    this.form.controls['fromDate'].setValue(undefined);
  }
}

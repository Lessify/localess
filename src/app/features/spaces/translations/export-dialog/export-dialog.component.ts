import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { ExportDialogModel } from './export-dialog.model';

@Component({
  selector: 'll-translation-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmSelectImports],
  providers: [provideIcons({ lucideCloudDownload })],
})
export class ExportDialogComponent {
  private readonly fb = inject(FormBuilder);
  data = inject<ExportDialogModel>(MAT_DIALOG_DATA);

  exportKinds: KeyValue<string, string>[] = [
    { key: 'FULL', value: 'FULL' },
    { key: 'FLAT', value: 'FLAT JSON' },
  ];

  form: FormGroup = this.fb.group({
    kind: this.fb.control('FULL', [Validators.required]),
    locale: this.fb.control(undefined),
  });

  protected readonly kindItemToString = (value: string): string => {
    return this.exportKinds.find(k => k.key === value)?.value ?? value;
  };

  protected readonly localeItemToString = (value: string): string => {
    return this.data.locales.find(l => l.id === value)?.name ?? value;
  };
}

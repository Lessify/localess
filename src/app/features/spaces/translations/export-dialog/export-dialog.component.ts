import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload } from '@ng-icons/lucide';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { ExportDialogContext, ExportDialogResult } from './export-dialog.model';

@Component({
  selector: 'll-translation-export-dialog',
  templateUrl: './export-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmSelectImports],
  providers: [provideIcons({ lucideCloudDownload })],
})
export class ExportDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<ExportDialogResult>>(BrnDialogRef);

  /** Required: the locale picker for a FLAT export is built from it. */
  readonly context = injectBrnDialogContext<ExportDialogContext>();

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
    return this.context.locales.find(l => l.id === value)?.name ?? value;
  };

  save(): void {
    this.dialogRef.close(this.form.value as ExportDialogResult);
  }
}

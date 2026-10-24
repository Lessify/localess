import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideUpload, lucideUploadCloud } from '@ng-icons/lucide';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { ImportDialogContext, ImportDialogResult } from './import-dialog.model';

/** A Localess file, an old export, or one locale as key-value JSON. */
const EXTENSIONS = ['.localess.zip', '.llt.zip', '.json'];

@Component({
  selector: 'll-translation-import-dialog',
  templateUrl: './import-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmSelectImports,
    LocaleIconComponent,
  ],
  providers: [provideIcons({ lucideUpload, lucideUploadCloud })],
})
export class ImportDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<ImportDialogResult>>(BrnDialogRef);

  /** Required: the locale picker for a key-value JSON is built from it. */
  readonly context = injectBrnDialogContext<ImportDialogContext>();

  readonly fileAccept = EXTENSIONS.join(',');
  /** A key-value JSON: it holds one locale, which the user names. */
  readonly isJson = signal(false);
  fileWrong = false;
  fileName = '';

  form: FormGroup = this.fb.group(
    {
      locale: this.fb.control<string | null>(null),
      file: this.fb.control<File | undefined>(undefined, [Validators.required]),
    },
    { validators: () => (this.fileWrong || (this.isJson() && !this.form?.value.locale) ? { file: true } : null) },
  );

  protected readonly localeItemToString = (value: string): string => {
    return this.context.locales.find(l => l.id === value)?.name ?? value;
  };

  async onFileChange(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.files?.length) return;
    const file = target.files[0];
    const name = file.name.toLowerCase();
    this.fileName = file.name;
    this.fileWrong = !EXTENSIONS.some(it => name.endsWith(it));
    this.isJson.set(!this.fileWrong && name.endsWith('.json'));
    // `de.json` → German, when it is a locale of the space.
    const fromName = name.replace(/\.json$/, '');
    const locale = this.isJson() ? (this.context.locales.find(it => it.id.toLowerCase() === fromName)?.id ?? null) : null;
    this.form.patchValue({ file, locale });
    this.form.updateValueAndValidity();
  }

  save(): void {
    const { file, locale } = this.form.value as { file: File; locale: string | null };
    this.dialogRef.close(this.isJson() && locale ? { file, locale } : { file });
  }
}

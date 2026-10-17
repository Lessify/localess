import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceService } from '@core/services/space.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideFile,
  lucideFileStack,
  lucideImages,
  lucideLanguages,
  lucideLayoutTemplate,
  lucideNewspaper,
  lucideShoppingCart,
} from '@ng-icons/lucide';
import { SpaceValidator } from '@shared/validators/space.validator';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { catchError, of } from 'rxjs';

import { SpaceCreateDialogResult } from './space-create-dialog.model';

/** Creating a space, optionally from a template. Renaming lives in SpaceEditDialogComponent. */
@Component({
  selector: 'll-space-create-dialog',
  templateUrl: './space-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmRadioGroupImports,
  ],
  providers: [
    provideIcons({ lucideFile, lucideFileStack, lucideImages, lucideLanguages, lucideLayoutTemplate, lucideNewspaper, lucideShoppingCart }),
  ],
})
export class SpaceCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<SpaceCreateDialogResult>>(BrnDialogRef);
  readonly fe = inject(FormErrorHandlerService);

  /**
   * What the server offers this user (by permission, and test templates only in development and e2e). A list that
   * fails to load leaves the name alone: Empty is sent, and the server decides as always.
   */
  readonly templates = toSignal(
    inject(SpaceService)
      .templates()
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  /** Only Empty (or nothing yet) leaves no choice to make: the control stays hidden and Empty is sent. */
  readonly canChooseTemplate = computed(() => this.templates().length > 1);

  // `template` is always present and always defaulted, so the caller never has to handle undefined.
  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
    template: this.fb.control('EMPTY'),
  });

  save(): void {
    this.dialogRef.close(this.form.value as SpaceCreateDialogResult);
  }
}

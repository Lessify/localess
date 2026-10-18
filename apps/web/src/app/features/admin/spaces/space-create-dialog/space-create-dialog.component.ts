import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceService } from '@core/services/space.service';
import { SpaceTemplateId } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import {
  lucideFile,
  lucideFileStack,
  lucideFolderTree,
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
import { NO_TEMPLATE_VIEW, SPACE_TEMPLATE_VIEWS } from './space-templates';

/** The form's value for Empty: a radio needs a value, the request gets no template. */
const NO_TEMPLATE = '';

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
    provideIcons({
      lucideFile,
      lucideFileStack,
      lucideFolderTree,
      lucideImages,
      lucideLanguages,
      lucideLayoutTemplate,
      lucideNewspaper,
      lucideShoppingCart,
    }),
  ],
})
export class SpaceCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<SpaceCreateDialogResult>>(BrnDialogRef);
  readonly fe = inject(FormErrorHandlerService);

  /**
   * What the server offers this user (by permission, and test templates only in development and e2e). A list that
   * fails to load leaves the name alone: no template is sent, and the space is created on its own.
   */
  private readonly offered = toSignal(
    inject(SpaceService)
      .templates()
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  /**
   * The choice cards: Empty (no template, the form's `''`) first, then the offered ones in the server's order. `key`
   * names the card's elements (Empty's value can not).
   */
  readonly templates = computed(() => [
    { id: NO_TEMPLATE, key: 'EMPTY', ...NO_TEMPLATE_VIEW },
    ...this.offered().map(id => ({ id, key: id, ...SPACE_TEMPLATE_VIEWS[id] })),
  ]);

  /** Nothing offered leaves no choice to make: the control stays hidden and no template is sent. */
  readonly canChooseTemplate = computed(() => this.offered().length > 0);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
    template: this.fb.control<SpaceTemplateId | typeof NO_TEMPLATE>(NO_TEMPLATE),
  });

  save(): void {
    const { name, template } = this.form.value as { name: string; template: SpaceTemplateId | typeof NO_TEMPLATE };
    this.dialogRef.close(template === NO_TEMPLATE ? { name } : { name, template });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFile, lucideLayoutTemplate, lucideNewspaper, lucideShoppingCart } from '@ng-icons/lucide';
import { UserPermission } from '@shared/models/user.model';
import { UserStore } from '@shared/stores/user.store';
import { SpaceValidator } from '@shared/validators/space.validator';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';

import { EMPTY_TEMPLATE_ID, SPACE_TEMPLATES } from '../templates';
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
  providers: [provideIcons({ lucideFile, lucideLayoutTemplate, lucideNewspaper, lucideShoppingCart })],
})
export class SpaceCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userStore = inject(UserStore);
  private readonly dialogRef = inject<BrnDialogRef<SpaceCreateDialogResult>>(BrnDialogRef);
  readonly fe = inject(FormErrorHandlerService);

  readonly templates = SPACE_TEMPLATES;

  /**
   * Templates are offered only to someone who may create schemas.
   *
   * The client is the writer here, so a user without SCHEMA_CREATE would have the batch rejected by
   * firestore.rules. Rather than show a control that cannot work, the whole thing is hidden - such
   * a user simply gets a name field, and EMPTY is the effective behaviour.
   *
   * A computed rather than the shared `canUserPerform` pipe, because this is read in TypeScript as
   * well as the template. The pipe is deliberately left untouched: its array form is `.some()` -
   * any-of - which would silently be the wrong check once seeding content adds CONTENT_CREATE to
   * this condition.
   */
  readonly canChooseTemplate = computed(() => {
    const role = this.userStore.role();
    if (role === 'admin') return true;
    return role === 'custom' && (this.userStore.permissions() ?? []).includes(UserPermission.SCHEMA_CREATE);
  });

  // `template` is always present and always defaulted, so the caller never has to handle undefined.
  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
    template: this.fb.control(EMPTY_TEMPLATE_ID),
  });

  save(): void {
    this.dialogRef.close(this.form.value as SpaceCreateDialogResult);
  }
}

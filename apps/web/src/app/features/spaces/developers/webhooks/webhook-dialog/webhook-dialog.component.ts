import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { WebHookEvent } from '@localess/shared';
import { ChipRemoveLabelDirective } from '@shared/directives/chip-remove-label.directive';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { WebhookValidator } from '../webhook.validator';
import { WebhookDialogContext, WebhookDialogResult } from './webhook-dialog.model';

@Component({
  selector: 'll-webhook-dialog',
  templateUrl: './webhook-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `hlm-dialog-content` is a grid whose single item is this host, so its `gap-4` never reaches the
  // parts inside - set the spacing here or header/form/footer end up flush against each other.
  host: { class: 'grid gap-4' },
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmInputGroupImports,
    HlmInputImports,
    HlmComboboxImports,
    ChipRemoveLabelDirective,
  ],
})
export class WebhookDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<WebhookDialogResult>>(BrnDialogRef);

  /**
   * Optional, and read with `?.` throughout: adding a webhook passes no context. Spartan injects an object
   * either way (at least `{ close }`), so "editing" is decided by the webhook's `id`, not by the context.
   */
  readonly context = injectBrnDialogContext<Partial<WebhookDialogContext>>({ optional: true });
  readonly isEdit = this.context?.id != null;

  webhookEvents = Object.values(WebHookEvent);

  form: FormGroup = this.fb.group({
    name: this.fb.control(this.context?.name || '', WebhookValidator.NAME),
    url: this.fb.control(this.context?.url || '', WebhookValidator.URL),
    events: this.fb.control(this.context?.events || [], WebhookValidator.EVENTS),
    signed: this.fb.control(false),
  });

  protected readonly eventItemToString = (value: string): string => value;

  save(): void {
    const { name, url, events, signed } = this.form.getRawValue();
    const result: WebhookDialogResult = { name, url, events };
    // Signing an existing webhook is on its page (a new secret, shown once).
    if (!this.isEdit && signed) result.signed = true;
    this.dialogRef.close(result);
  }
}

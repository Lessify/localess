import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { WebHookEvent } from '@shared/models/webhook.model';
import { WebhookValidator } from '@shared/validators/webhook.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

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
    HlmFieldImports,
    HlmInputGroupImports,
    HlmInputImports,
    HlmComboboxImports,
  ],
})
export class WebhookDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<WebhookDialogResult>>(BrnDialogRef);

  /**
   * Optional, and read with `?.` throughout: adding a webhook opens the dialog with no context at
   * all, which is exactly the case the option exists for. The template also keys its title off it.
   */
  readonly context = injectBrnDialogContext<WebhookDialogContext>({ optional: true });

  webhookEvents = Object.values(WebHookEvent);

  form: FormGroup = this.fb.group({
    name: this.fb.control(this.context?.name || '', WebhookValidator.NAME),
    url: this.fb.control(this.context?.url || '', WebhookValidator.URL),
    events: this.fb.control(this.context?.events || [], WebhookValidator.EVENTS),
    secret: this.fb.control(this.context?.secret || ''),
  });

  protected readonly eventItemToString = (value: string): string => value;

  save(): void {
    this.dialogRef.close(this.form.value as WebhookDialogResult);
  }
}

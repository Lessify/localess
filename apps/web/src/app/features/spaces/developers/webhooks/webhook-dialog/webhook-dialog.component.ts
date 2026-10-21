import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  /** The secret is never sent to the browser: the field starts empty, and empty keeps the one set. */
  readonly hasSecret = this.isEdit && this.context?.hasSecret === true;

  webhookEvents = Object.values(WebHookEvent);

  form: FormGroup = this.fb.group({
    name: this.fb.control(this.context?.name || '', WebhookValidator.NAME),
    url: this.fb.control(this.context?.url || '', WebhookValidator.URL),
    events: this.fb.control(this.context?.events || [], WebhookValidator.EVENTS),
    secret: this.fb.control(''),
    removeSecret: this.fb.control(false),
  });

  constructor() {
    // Removing the secret: nothing to type.
    this.form.controls['removeSecret'].valueChanges.pipe(takeUntilDestroyed()).subscribe(remove => {
      const secret = this.form.controls['secret'];
      if (remove) {
        secret.setValue('');
        secret.disable();
      } else secret.enable();
    });
  }

  protected readonly eventItemToString = (value: string): string => value;

  save(): void {
    const { name, url, events, secret, removeSecret } = this.form.getRawValue();
    const result: WebhookDialogResult = { name, url, events };
    if (removeSecret) result.secret = null;
    else if (secret) result.secret = secret;
    this.dialogRef.close(result);
  }
}

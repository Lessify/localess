import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { WEBHOOK_HEADERS_MAX, WebHookCreate, WebHookEvent, WebHookUpdate } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideX } from '@ng-icons/lucide';
import { ChipRemoveLabelDirective } from '@shared/directives/chip-remove-label.directive';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
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
    HlmIconImports,
    HlmInputGroupImports,
    HlmInputImports,
    HlmComboboxImports,
    ChipRemoveLabelDirective,
  ],
  providers: [provideIcons({ lucidePlus, lucideX })],
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
    // A kept header (editing) has its value on the server only: its name is fixed, an empty value keeps it.
    headers: this.fb.array((this.context?.headerNames ?? []).map(name => this.header(name, true))),
  });

  readonly headersMax = WEBHOOK_HEADERS_MAX;

  get headers(): FormArray<FormGroup> {
    return this.form.controls['headers'] as FormArray<FormGroup>;
  }

  addHeader(): void {
    this.headers.push(this.header('', false));
  }

  removeHeader(index: number): void {
    this.headers.removeAt(index);
  }

  private header(name: string, kept: boolean): FormGroup {
    return this.fb.group({
      name: this.fb.control({ value: name, disabled: kept }, [Validators.required, WebhookValidator.HEADER_NAME]),
      value: this.fb.control('', kept ? [WebhookValidator.HEADER_VALUE] : [Validators.required, WebhookValidator.HEADER_VALUE]),
      kept: this.fb.control(kept),
    });
  }

  protected readonly eventItemToString = (value: string): string => value;

  save(): void {
    const { name, url, events, signed, headers } = this.form.getRawValue() as {
      name: string;
      url: string;
      events: WebHookEvent[];
      signed: boolean;
      headers: { name: string; value: string; kept: boolean }[];
    };
    if (this.isEdit) {
      // Every header kept: a typed value replaces, an empty one keeps the value it has.
      const update: WebHookUpdate = {
        name,
        url,
        events,
        headers: Object.fromEntries(headers.map(it => [it.name.trim(), it.kept && !it.value ? null : it.value])),
      };
      this.dialogRef.close(update);
      return;
    }
    const create: WebHookCreate = { name, url, events };
    if (headers.length) create.headers = Object.fromEntries(headers.map(it => [it.name.trim(), it.value]));
    // Signing an existing webhook is on its page (a new secret, shown once).
    if (signed) create.signed = true;
    this.dialogRef.close(create);
  }
}

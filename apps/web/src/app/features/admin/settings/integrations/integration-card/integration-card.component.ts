import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '@core/services/notification.service';
import type { Integration, IntegrationDefinition, IntegrationField, IntegrationSave, IntegrationTestResult } from '@localess/shared';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { filter, switchMap, take } from 'rxjs';

import { IntegrationService } from '../integration.service';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/** What the card's badge says, by where the configuration comes from and how its key is doing. */
function badgeOf(integration: Integration): { label: string; variant: BadgeVariant } {
  if (integration.source === 'env') return { label: 'Server configuration', variant: 'secondary' };
  if (integration.source === 'none') return { label: 'Not connected', variant: 'outline' };
  switch (integration.status) {
    case 'unverified':
      return { label: 'Not verified', variant: 'outline' };
    case 'rejected':
      return { label: 'Key rejected', variant: 'destructive' };
    case 'quota':
      return { label: 'Quota reached', variant: 'destructive' };
    case 'unreadable':
      return { label: 'Key unreadable', variant: 'destructive' };
    default:
      return integration.enabled ? { label: 'Connected', variant: 'default' } : { label: 'Switched off', variant: 'outline' };
  }
}

/**
 * One integration in Admin → Settings → Integrations. The form is generated from the definition's fields, so a new
 * integration needs no code here. A saved key is never shown: only its hint.
 */
@Component({
  selector: 'll-integration-card',
  templateUrl: './integration-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
    HlmSpinnerImports,
    HlmSwitchImports,
    HlmTextareaImports,
  ],
})
export class IntegrationCardComponent {
  private readonly integrationService = inject(IntegrationService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(HlmDialogService);

  readonly definition = input.required<IntegrationDefinition>();
  readonly integration = input.required<Integration>();

  readonly badge = computed(() => badgeOf(this.integration()));
  readonly envLocked = computed(() => this.integration().source === 'env');
  readonly saved = computed(() => this.integration().source === 'ui');
  readonly hints = computed(() =>
    this.definition()
      .fields.filter(field => this.integration().hints[field.key])
      .map(field => ({ label: field.label, value: this.integration().hints[field.key] })),
  );

  /** The open form (Connect, Replace, Enter again); undefined when closed. */
  readonly form = signal<FormGroup<Record<string, FormControl<string>>> | undefined>(undefined);
  readonly busy = signal(false);
  /** The last test or save answer, shown under the card. */
  readonly result = signal<IntegrationTestResult | undefined>(undefined);

  /** The open form's control of `field` (the form has one per field). */
  control(field: IntegrationField): FormControl<string> {
    return this.form()!.controls[field.key]!;
  }

  inputId(field: IntegrationField): string {
    return `${this.definition().id}-${field.key}`;
  }

  /** Opens the generated form: secret and file fields are required, text fields start on their default. */
  open(): void {
    const controls: Record<string, FormControl<string>> = {};
    for (const field of this.definition().fields) {
      controls[field.key] = new FormControl(field.type === 'text' ? (field.default ?? '') : '', {
        nonNullable: true,
        validators: field.optional ? [] : [Validators.required],
      });
    }
    this.form.set(new FormGroup(controls));
    this.result.set(undefined);
  }

  cancel(): void {
    this.form.set(undefined);
    this.result.set(undefined);
  }

  /** Reads a chosen file (the service account JSON) into its field. */
  async readFile(field: IntegrationField, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.form()?.controls[field.key].setValue(await file.text());
  }

  /** Test & enable; `skipTest` only after the provider couldn't be reached. */
  submit(skipTest = false): void {
    const form = this.form();
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      return;
    }
    const body: IntegrationSave = skipTest ? { values: form.getRawValue(), skipTest: true } : { values: form.getRawValue() };
    this.busy.set(true);
    this.integrationService.save(this.definition().id, body).subscribe({
      next: () => {
        this.busy.set(false);
        // The key isn't kept in the page once it's saved.
        this.form.set(undefined);
        this.result.set(undefined);
        this.notificationService.success(`${this.definition().name} is connected.`);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.result.set(this.failure(error));
      },
    });
  }

  /** Tests the active configuration (env or saved). */
  test(): void {
    this.busy.set(true);
    this.integrationService.test(this.definition().id).subscribe({
      next: result => {
        this.busy.set(false);
        this.result.set(result);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.result.set(this.failure(error));
      },
    });
  }

  setEnabled(enabled: boolean): void {
    this.integrationService.setEnabled(this.definition().id, enabled).subscribe({
      error: () => this.notificationService.error(`${this.definition().name} could not be switched ${enabled ? 'on' : 'off'}.`),
    });
  }

  disconnect(): void {
    this.dialogService
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: `Disconnect ${this.definition().name}`,
          content: `The saved key is deleted. ${this.definition().name} stops working until someone connects it again.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.integrationService.remove(this.definition().id)),
      )
      .subscribe({
        next: () => this.notificationService.success(`${this.definition().name} is disconnected.`),
        error: () => this.notificationService.error(`${this.definition().name} could not be disconnected.`),
      });
  }

  /** A test result from the server (422), or the server's message as one. */
  private failure(error: unknown): IntegrationTestResult {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as Partial<IntegrationTestResult> | null;
      if (body && typeof body.ok === 'boolean' && typeof body.message === 'string') return body as IntegrationTestResult;
      if (body && typeof body.message === 'string') return { ok: false, reason: 'invalid', message: body.message };
    }
    return { ok: false, message: 'Something went wrong. Try again.' };
  }
}

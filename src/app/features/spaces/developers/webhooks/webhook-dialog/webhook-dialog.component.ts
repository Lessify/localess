import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { WebHook, WebHookEvent } from '@shared/models/webhook.model';
import { WebhookValidator } from '@shared/validators/webhook.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';

@Component({
  selector: 'll-webhook-dialog',
  templateUrl: './webhook-dialog.component.html',
  styleUrls: ['./webhook-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputGroupImports,
    HlmInputImports,
    HlmSelectImports,
  ],
})
export class WebhookDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<WebHook | undefined>(MAT_DIALOG_DATA);

  webhookEvents = Object.values(WebHookEvent);

  form: FormGroup = this.fb.group({
    name: this.fb.control(this.data?.name || '', WebhookValidator.NAME),
    url: this.fb.control(this.data?.url || '', WebhookValidator.URL),
    events: this.fb.control(this.data?.events || [], WebhookValidator.EVENTS),
    secret: this.fb.control(this.data?.secret || ''),
  });

  protected readonly eventItemToString = (value: string): string => value;
}

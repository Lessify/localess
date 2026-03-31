import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { WebHook, WebHookEvent } from '@shared/models/webhook.model';
import { WebhookValidator } from '@shared/validators/webhook.validator';

@Component({
  selector: 'll-webhook-dialog',
  templateUrl: './webhook-dialog.component.html',
  styleUrls: ['./webhook-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSelectModule,
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
}

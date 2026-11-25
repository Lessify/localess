import { ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCopy, lucideTriangleAlert } from '@ng-icons/lucide';
import { injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';

export interface WebhookSecretDialogContext {
  name: string;
  secret: string;
}

/** A webhook's new signing secret: the only time it is shown. */
@Component({
  selector: 'll-webhook-secret-dialog',
  templateUrl: './webhook-secret-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, HlmButtonImports, HlmFieldImports, HlmIconImports, ClipboardModule],
  providers: [provideIcons({ lucideCopy, lucideTriangleAlert })],
})
export class WebhookSecretDialogComponent {
  readonly context = injectBrnDialogContext<WebhookSecretDialogContext>();
  private readonly notifications = inject(NotificationService);

  copied(): void {
    this.notifications.success('Signing secret copied to clipboard.');
  }
}

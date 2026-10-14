import { ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCopy, lucideSquareTerminal, lucideTriangleAlert } from '@ng-icons/lucide';
import { injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';

export interface TokenSecretDialogContext {
  name: string;
  token: string;
  /** `localess login …` for this token, the Localess the user is on and the selected space. */
  cliLogin: string;
}

/** The value of a new or regenerated management token: the only time it is shown. */
@Component({
  selector: 'll-token-secret-dialog',
  templateUrl: './token-secret-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, HlmButtonImports, HlmFieldImports, HlmIconImports, ClipboardModule],
  providers: [provideIcons({ lucideCopy, lucideSquareTerminal, lucideTriangleAlert })],
})
export class TokenSecretDialogComponent {
  readonly context = injectBrnDialogContext<TokenSecretDialogContext>();
  private readonly notifications = inject(NotificationService);

  copied(what: string): void {
    this.notifications.success(`${what} copied to clipboard.`);
  }
}

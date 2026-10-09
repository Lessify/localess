import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

import { WHATS_NEW } from './whats-new.data';
import { WHATS_NEW_LABEL_CLASS } from './whats-new.model';

@Component({
  selector: 'll-whats-new-dialog',
  templateUrl: './whats-new-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `hlm-dialog-content` is a grid whose single item is this host, so its `gap-4` never reaches the
  // parts inside - set the spacing here or header and footer end up flush against each other.
  host: { class: 'grid gap-4' },
  imports: [DatePipe, HlmBadgeImports, HlmButtonImports, HlmDialogImports],
})
export class WhatsNewDialogComponent {
  /**
   * Read straight from the shipped data instead of a dialog context: the notes describe the build
   * the user is running, so no caller is in a position to pass a different list.
   */
  readonly releases = WHATS_NEW;

  /** Exposed for the template; the colours themselves belong to the label, not to this dialog. */
  readonly labelClass = WHATS_NEW_LABEL_CLASS;
}

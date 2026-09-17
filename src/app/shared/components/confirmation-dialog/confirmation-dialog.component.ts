import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

import { ConfirmationDialogContext, ConfirmationDialogResult } from './confirmation-dialog.model';

@Component({
  selector: 'll-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `hlm-dialog-content` is a grid whose single item is this host, so its `gap-4` never reaches the
  // parts inside - set the spacing here or header and footer end up flush against each other.
  host: { class: 'grid gap-4' },
  imports: [HlmButtonImports, HlmDialogImports],
})
export class ConfirmationDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<ConfirmationDialogResult>>(BrnDialogRef);

  /** Not optional: every caller passes a title and content, so a missing context is a bug worth throwing on. */
  readonly context = injectBrnDialogContext<ConfirmationDialogContext>();

  /**
   * Callers speak in `primary` / `destructive`; Spartan calls its primary button `default`. Mapping
   * here keeps that naming out of the 17 call sites.
   */
  readonly okVariant: 'default' | 'destructive' = this.context.variant === 'destructive' ? 'destructive' : 'default';

  /**
   * Only the confirming button needs code - `hlmDialogClose` on Cancel closes with no result, and
   * the callers' `filter` drops `undefined` the same way it drops `false`.
   */
  confirm(): void {
    this.dialogRef.close(true);
  }
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UploadItem, UploadQueue } from '@core/utils/upload-queue';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck, lucideClock, lucideRotateCcw, lucideX } from '@ng-icons/lucide';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/**
 * The uploads of a screen (`UploadQueue`) in its action bar: a pill with how many are done and the bytes sent, and a
 * popover with each file (waiting, its progress, done, or why it failed with Retry). Shown only while the queue has a
 * file; the queue does the uploading, this only shows it.
 */
@Component({
  selector: 'll-upload-queue',
  templateUrl: './upload-queue.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormatFileSizePipe,
    HlmBadgeImports,
    HlmButtonImports,
    HlmIconImports,
    HlmPopoverImports,
    HlmProgressImports,
    HlmSpinnerImports,
    HlmTooltipImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleCheck, lucideClock, lucideRotateCcw, lucideX })],
})
export class UploadQueueComponent {
  readonly queue = input.required<UploadQueue>();

  /** The files still counted in "n of m": the failed ones are told apart. */
  readonly counted = computed(() => this.queue().items().length - this.queue().failed());

  readonly label = computed(() => {
    const queue = this.queue();
    const failed = queue.failed() ? `, ${queue.failed()} failed` : '';
    return queue.pending() ? `Uploading ${queue.done()} of ${this.counted()}${failed}` : `Uploads${failed}`;
  });

  percentOf(item: UploadItem): number | undefined {
    return item.total ? Math.min(100, Math.round((item.loaded / item.total) * 100)) : undefined;
  }
}

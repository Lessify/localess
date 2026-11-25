import { DOCUMENT } from '@angular/common';
import { DestroyRef, effect, inject, Injectable, Injector } from '@angular/core';
import { ActiveTasksSummary, TaskNotifierService } from '@core/services/task-notifier.service';
import { DocumentTitleService } from '@core/title/document-title.service';

/** How long each of the two icons shows while a task runs: the Swap of the sidebar logo, in the browser tab. */
export const TAB_ICON_FRAME_MS = 700;
/** The tab icon with the L's colours swapped (generated with the rest of the logo set). */
export const TAB_ICON_SWAPPED = 'assets/favicon-swapped-32x32.png';

/**
 * Shows in the browser tab that a task the user started is still running (an import, an export, Translate Locale), so
 * it can be seen from another tab: the tab icon swaps its colours, and the title leads with the task and its progress
 * ("42% Translation Export · Localess - Tasks"). Both go back to normal when the last one ends. Started once by the
 * features shell, after TaskNotifierService, which knows the user's tasks.
 */
@Injectable({ providedIn: 'root' })
export class TabActivityService {
  private readonly document = inject(DOCUMENT);
  private readonly taskNotifier = inject(TaskNotifierService);
  private readonly documentTitle = inject(DocumentTitleService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private started = false;
  private timer?: ReturnType<typeof setInterval>;
  /** Each icon link with the icon it had before the swapping began. */
  private icons: { link: HTMLLinkElement; href: string }[] = [];

  start(): void {
    if (this.started) return;
    this.started = true;
    effect(
      () => {
        const active = this.taskNotifier.active();
        this.documentTitle.setActivity(active ? describe(active) : undefined);
        if (active) this.swapIcon();
        else this.restoreIcon();
      },
      { injector: this.injector },
    );
    this.destroyRef.onDestroy(() => {
      this.restoreIcon();
      this.documentTitle.setActivity(undefined);
    });
  }

  private swapIcon(): void {
    if (this.timer || this.reducedMotion()) return;
    // rel="icon" only: not the apple-touch-icon, which a browser tab never shows.
    this.icons = [...this.document.querySelectorAll<HTMLLinkElement>('link[rel]')]
      .filter(link => link.rel.split(/\s+/).includes('icon'))
      .map(link => ({ link, href: link.href }));
    let swapped = false;
    this.timer = setInterval(() => {
      swapped = !swapped;
      for (const { link, href } of this.icons) link.href = swapped ? TAB_ICON_SWAPPED : href;
    }, TAB_ICON_FRAME_MS);
  }

  private restoreIcon(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
    for (const { link, href } of this.icons) link.href = href;
    this.icons = [];
  }

  private reducedMotion(): boolean {
    return this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}

/** "42% Translation Export", "Translation Export…" before the first progress, "3 tasks…" for several. */
function describe({ count, label, percent }: ActiveTasksSummary): string {
  if (count > 1) return `${count} tasks…`;
  return percent === undefined ? `${label}…` : `${percent}% ${label}`;
}

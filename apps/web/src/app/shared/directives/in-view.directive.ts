import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Tells whether its element is on screen (an `IntersectionObserver` on the viewport; a scroll container that clips it
 * counts). Put on a marker at the end of a list to load more when the user scrolls to it: `(llInView)` emits `true`
 * when it comes into view and `false` when it leaves, so a page can load again while the marker is still showing.
 * Nothing is emitted when the element is removed: the page forgets the marker's state when it reloads its list.
 */
@Directive({ selector: '[llInView]' })
export class InViewDirective {
  readonly llInView = output<boolean>();

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(entries => {
        const entry = entries.at(-1);
        if (entry) this.llInView.emit(entry.isIntersecting);
      });
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

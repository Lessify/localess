import { computed, Directive, ElementRef, inject } from '@angular/core';
import { BrnResizableGroup } from '@spartan-ng/brain/resizable';

/**
 * Gives a resize handle the value a focusable separator (a window splitter) needs: the size of the panel before it,
 * in %. Set from the app: packages/ui keeps the Spartan components as shipped.
 */
@Directive({
  selector: 'hlm-resizable-handle[llSplitterValue]',
  host: {
    '[attr.aria-valuenow]': 'valueNow()',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
  },
})
export class SplitterValueDirective {
  private readonly group = inject(BrnResizableGroup);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The group's layout is in panel order; only its own panels count (its direct children, not a nested group's). */
  readonly valueNow = computed(() => {
    const layout = this.group.layout();
    const host = this.host.nativeElement;
    const panels = Array.from(host.parentElement?.children ?? []).filter(it => it.matches('[data-slot="resizable-panel"]'));
    const size = layout[panels.indexOf(host.previousElementSibling as Element)];
    return size === undefined ? null : Math.round(size);
  });
}

import { afterEveryRender, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Names a combobox chip's remove button, which shows only an icon (e.g. "Remove translation.published"). Set from the
 * app: packages/ui keeps the Spartan components as shipped.
 */
@Directive({
  selector: 'hlm-combobox-chip[llChipRemoveLabel]',
})
export class ChipRemoveLabelDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly label = input.required<string>({ alias: 'llChipRemoveLabel' });

  constructor() {
    // After every render: the button is the chip's own and comes and goes with it (shown while the chip can be removed).
    afterEveryRender(() => {
      this.host.nativeElement.querySelector('button[data-slot="combobox-chip-remove"]')?.setAttribute('aria-label', this.label());
    });
  }
}

import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ChipRemoveLabelDirective } from './chip-remove-label.directive';

// The chip's markup as Spartan renders it: an icon-only remove button, while the chip can be removed.
@Component({
  imports: [ChipRemoveLabelDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <hlm-combobox-chip [llChipRemoveLabel]="label()">
      value
      @if (removable()) {
        <button data-slot="combobox-chip-remove"></button>
      }
    </hlm-combobox-chip>
  `,
})
class Host {
  readonly label = signal('Remove translation.published');
  readonly removable = signal(true);
}

describe('ChipRemoveLabelDirective', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = () => (fixture.nativeElement as HTMLElement).querySelector('button');
    return { fixture, button };
  }

  it("names the chip's remove button", () => {
    const { button } = setup();
    expect(button()?.getAttribute('aria-label')).toBe('Remove translation.published');
  });

  it('follows a new label, and a button that comes back', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.label.set('Remove content.published');
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-label')).toBe('Remove content.published');

    fixture.componentInstance.removable.set(false);
    fixture.detectChanges();
    fixture.componentInstance.removable.set(true);
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-label')).toBe('Remove content.published');
  });
});

import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrnResizableGroup } from '@spartan-ng/brain/resizable';
import { describe, expect, it } from 'vitest';

import { SplitterValueDirective } from './splitter-value.directive';

const layout = signal<number[]>([20, 50.4, 29.6]);

// A group of three panels, the handle after the second; the first holds a nested group with panels of its own, which
// are not in this group's layout (counting them would read the third panel's size).
@Component({
  imports: [SplitterValueDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: BrnResizableGroup, useValue: { layout } }],
  template: `
    <div>
      <div data-slot="resizable-panel">
        <div>
          <div data-slot="resizable-panel"></div>
          <div data-slot="resizable-panel"></div>
        </div>
      </div>
      <div data-slot="resizable-panel"></div>
      <hlm-resizable-handle llSplitterValue></hlm-resizable-handle>
      <div data-slot="resizable-panel"></div>
    </div>
  `,
})
class Host {}

describe('SplitterValueDirective', () => {
  function handle(): HTMLElement {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('hlm-resizable-handle')!;
  }

  it('reports the size of the panel before it, in %, counting only its own group panels', () => {
    const el = handle();
    expect(el.getAttribute('aria-valuenow')).toBe('50');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
  });

  it('follows the layout', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    layout.set([20, 25, 55]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('hlm-resizable-handle')!.getAttribute('aria-valuenow')).toBe('25');
    layout.set([20, 50.4, 29.6]);
  });
});

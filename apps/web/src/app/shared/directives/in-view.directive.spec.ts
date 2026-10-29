import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { InViewDirective } from './in-view.directive';

@Component({
  imports: [InViewDirective],
  template: `<div (llInView)="seen.set($event)"></div>`,
})
class HostComponent {
  readonly seen = signal<boolean | undefined>(undefined);
}

describe('InViewDirective', () => {
  let callback: IntersectionObserverCallback | undefined;
  const disconnect = vi.fn();
  const observe = vi.fn();

  beforeEach(() => {
    callback = undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('emits whether the element is in view, and stops observing when destroyed', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    expect(observe).toHaveBeenCalledWith(fixture.nativeElement.querySelector('div'));

    callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(fixture.componentInstance.seen()).toBe(true);
    callback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(fixture.componentInstance.seen()).toBe(false);

    fixture.destroy();
    expect(disconnect).toHaveBeenCalled();
  });
});

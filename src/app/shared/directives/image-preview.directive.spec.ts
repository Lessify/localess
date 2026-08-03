import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import { ImagePreviewDirective } from './image-preview.directive';

@Component({
  template: `<div><img llImagePreview /></div>`,
  imports: [ImagePreviewDirective],
})
class DefaultScaleHostComponent {}

@Component({
  template: `<div><img [llImagePreview]="scale" /></div>`,
  imports: [ImagePreviewDirective],
})
class CustomScaleHostComponent {
  scale = 3;
}

describe('ImagePreviewDirective', () => {
  function getImg(fixture: { nativeElement: HTMLElement }): HTMLImageElement {
    return fixture.nativeElement.querySelector('img')!;
  }

  function getDirective(fixture: { debugElement: import('@angular/core').DebugElement }): ImagePreviewDirective {
    return fixture.debugElement.query(By.directive(ImagePreviewDirective)).injector.get(ImagePreviewDirective);
  }

  it('scales up and adjusts the parent overflow on mouse enter, using the default scale of 2', () => {
    const fixture = TestBed.createComponent(DefaultScaleHostComponent);
    fixture.detectChanges();
    const img = getImg(fixture);

    getDirective(fixture).onMouseOver();

    expect(img.style.transform).toBe('scale(2)');
    expect(img.style.cursor).toBe('zoom-in');
    expect(img.style.zIndex).toBe('50');
    expect(img.parentElement!.style.overflow).toBe('visible');
  });

  it('uses a custom scale when provided via the input', () => {
    const fixture = TestBed.createComponent(CustomScaleHostComponent);
    fixture.detectChanges();
    const img = getImg(fixture);

    getDirective(fixture).onMouseOver();

    expect(img.style.transform).toBe('scale(3)');
  });

  it('resets styles immediately on mouse out, then clears transform/overflow after the delay', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(DefaultScaleHostComponent);
      fixture.detectChanges();
      const img = getImg(fixture);
      const directive = getDirective(fixture);

      directive.onMouseOver();
      directive.onMouseOut();

      expect(img.style.transform).toBe('scale(1)');
      expect(img.style.zIndex).toBe('');
      expect(img.style.cursor).toBe('');

      vi.advanceTimersByTime(400);

      expect(img.style.transform).toBe('');
      expect(img.style.transition).toBe('');
      expect(img.parentElement!.style.overflow).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });
});

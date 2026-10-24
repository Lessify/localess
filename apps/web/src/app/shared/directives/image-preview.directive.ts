import { Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';

@Directive({
  selector: 'img[llImagePreview]',
  host: {
    '(mouseenter)': 'onMouseOver()',
    '(mouseleave)': 'onMouseOut()',
  },
})
export class ImagePreviewDirective {
  private hostElement = inject<ElementRef<HTMLImageElement>>(ElementRef);

  /** How much the preview enlarges the image; a bare `llImagePreview` (no value) is 2. */
  scale = input(2, { alias: 'llImagePreview', transform: (value: number | string) => numberAttribute(value, 2) });

  onMouseOver() {
    if (this.hostElement.nativeElement.parentElement) {
      this.hostElement.nativeElement.parentElement.style.overflow = 'visible';
    }
    this.hostElement.nativeElement.style.cursor = 'zoom-in';
    this.hostElement.nativeElement.style.zIndex = '50';
    this.hostElement.nativeElement.style.transform = `scale(${this.scale() || 2})`;
    this.hostElement.nativeElement.style.transition = 'transform 0.3s ease-in-out';
  }

  onMouseOut() {
    this.hostElement.nativeElement.style.transform = 'scale(1)';
    this.hostElement.nativeElement.style.zIndex = '';
    this.hostElement.nativeElement.style.cursor = '';
    setTimeout(() => {
      if (this.hostElement.nativeElement.parentElement) {
        this.hostElement.nativeElement.style.transform = '';
        this.hostElement.nativeElement.style.transition = '';
        this.hostElement.nativeElement.parentElement.style.overflow = '';
      }
    }, 400);
  }
}

import { Directive, ElementRef, HostListener, input } from '@angular/core';

@Directive({
  selector: 'img[llImagePreview]',
})
export class ImagePreviewDirective {
  scale = input<number>(2, { alias: 'llImagePreview' });

  constructor(private hostElement: ElementRef<HTMLImageElement>) {}

  @HostListener('mouseover')
  public onMouseOver() {
    if (this.hostElement.nativeElement.parentElement) {
      this.hostElement.nativeElement.parentElement.style.overflow = 'visible';
    }
    this.hostElement.nativeElement.style.cursor = 'zoom-in';
    this.hostElement.nativeElement.style.zIndex = '50';
    this.hostElement.nativeElement.style.transform = `scale(${this.scale() || 2})`;
    this.hostElement.nativeElement.style.transition = 'transform 0.3s ease-in-out';
  }

  @HostListener('mouseout')
  public onMouseOut() {
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

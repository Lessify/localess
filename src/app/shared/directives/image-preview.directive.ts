import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[llImagePreview]',
})
export class ImagePreviewDirective {
  constructor(private hostElement: ElementRef<HTMLImageElement>) {
    console.log('ImagePreviewDirective', hostElement.nativeElement);
  }

  @HostListener('mouseover', ['$event'])
  public onMouseOver(event: MouseEvent) {
    const img = event.target as HTMLImageElement;
    console.log('mouseover', event);
    console.log('mouseover', img.srcset);
  }
}

import { Directive, effect, ElementRef, input } from '@angular/core';

type AnimationClass = 'animate-spin' | 'animate-ping' | 'animate-pulse' | 'animate-bounce' | 'animate-none';

@Directive({
  selector: '[llAnimate]',
  standalone: true,
})
export class AnimateDirective {
  animate = input<boolean>(false, { alias: 'llAnimate' });
  class = input<AnimationClass>('animate-spin', { alias: 'llAnimateClass' });

  constructor(private hostElement: ElementRef<HTMLImageElement>) {
    effect(() => {
      if (this.animate()) {
        this.hostElement.nativeElement.classList.add(this.class());
      } else {
        this.hostElement.nativeElement.classList.remove(this.class());
      }
    });
  }
}

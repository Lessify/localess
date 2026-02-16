import { Directive, computed, input } from '@angular/core';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

@Directive({
  selector: '[hlmBreadcrumbButton]',
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmBreadcrumbButton {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });

  protected readonly _computedClass = computed(() =>
    hlm('hover:text-foreground transition-colors cursor-pointer inline-flex items-center', this.userClass()),
  );
}

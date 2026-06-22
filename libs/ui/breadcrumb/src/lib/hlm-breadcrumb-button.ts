import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmBreadcrumbButton]',
  host: {
    'data-slot': 'breadcrumb-button',
  },
})
export class HlmBreadcrumbButton {
  constructor() {
    classes(() => 'hover:text-foreground transition-colors cursor-pointer inline-flex items-center');
  }
}

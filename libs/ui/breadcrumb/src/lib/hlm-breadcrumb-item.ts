import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmBreadcrumbItem]',
  host: {
    'data-slot': 'breadcrumb-item',
  },
})
export class HlmBreadcrumbItem {
  constructor() {
    classes(() => 'gap-1 inline-flex items-center');
  }
}

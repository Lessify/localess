import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmBreadcrumbList]',
  host: {
    'data-slot': 'breadcrumb-list',
  },
})
export class HlmBreadcrumbList {
  constructor() {
    classes(() => 'text-muted-foreground gap-1.5 text-sm sm:gap-2.5 flex flex-wrap items-center wrap-break-word');
  }
}

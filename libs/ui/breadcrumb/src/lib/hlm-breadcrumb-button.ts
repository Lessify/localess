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
		classes(() => 'spartan-breadcrumb-link cursor-pointer');
	}
}

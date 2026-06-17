import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCommandShortcut],hlm-command-shortcut',
  host: {
    'data-slot': 'command-shortcut',
  },
})
export class HlmCommandShortcut {
  constructor() {
    classes(() => 'text-muted-foreground group-data-[selected]/command-item:text-foreground ms-auto text-xs tracking-widest');
  }
}

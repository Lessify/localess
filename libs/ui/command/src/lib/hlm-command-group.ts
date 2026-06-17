import { Directive } from '@angular/core';
import { BrnCommandGroup } from '@spartan-ng/brain/command';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCommandGroup],hlm-command-group',
  hostDirectives: [
    {
      directive: BrnCommandGroup,
      inputs: ['id'],
    },
  ],
  host: {
    'data-slot': 'command-group',
  },
})
export class HlmCommandGroup {
  constructor() {
    classes(
      () =>
        'text-foreground **:data-[slot=command-group-label]:text-muted-foreground overflow-hidden p-1 **:data-[slot=command-group-label]:px-2 **:data-[slot=command-group-label]:py-1.5 **:data-[slot=command-group-label]:text-xs **:data-[slot=command-group-label]:font-medium block data-hidden:hidden',
    );
  }
}

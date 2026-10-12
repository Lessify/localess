import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { InstanceLabel } from '@localess/shared';
import { cva } from 'class-variance-authority';

const labelVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xl font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground border-transparent',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        destructive: 'bg-destructive dark:bg-destructive/60 border-transparent text-white',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

/**
 * The label that tells installations apart (`LOCALESS_INSTANCE_NAME` / `LOCALESS_INSTANCE_COLOR`, served by
 * `GET /api/config`), for example "Test" in red: shown in the sidebar and on the login page.
 */
@Component({
  selector: 'll-instance-label',
  template: `<span [class]="labelClass()">{{ label().name }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstanceLabelComponent {
  readonly label = input.required<InstanceLabel>();
  protected readonly labelClass = computed(() => labelVariants({ variant: this.label().color }));
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';
import { BrnAccordionImports } from '@spartan-ng/brain/accordion';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

@Component({
  selector: 'hlm-accordion-trigger',
  imports: [BrnAccordionImports, NgIcon],
  providers: [provideIcons({ lucideChevronDown, lucideChevronUp })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 brnAccordionHeader class="flex">
      <button brnAccordionTrigger data-slot="accordion-trigger" [class]="_computedTriggerClass()">
        <ng-content />
        <ng-icon
          name="lucideChevronDown"
          data-slot="accordion-trigger-icon"
          class="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
        <ng-icon
          name="lucideChevronUp"
          data-slot="accordion-trigger-icon"
          class="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:inline group-aria-[expanded=false]/accordion-trigger:hidden" />
      </button>
    </h3>
  `,
})
export class HlmAccordionTrigger {
  public readonly triggerClass = input<ClassValue>('');

  protected readonly _computedTriggerClass = computed(() =>
    hlm(
      'focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground! rounded-md py-4 text-start text-sm font-medium hover:underline focus-visible:ring-3 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:text-[calc(var(--spacing)*4)] group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none aria-disabled:pointer-events-none aria-disabled:opacity-50',
      this.triggerClass(),
    ),
  );
}

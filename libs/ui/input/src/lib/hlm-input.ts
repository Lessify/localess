import { computed, Directive, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { BrnFieldControl } from '@spartan-ng/brain/field';
import { classes } from '@spartan-ng/helm/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ClassValue } from 'clsx';

export const inputVariants = cva(
	'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
	{
		variants: {
			error: {
				auto: '[&.ng-invalid.ng-touched]:border-destructive [&.ng-invalid.ng-touched]:ring-destructive/20 dark:[&.ng-invalid.ng-touched]:ring-destructive/40',
				true: 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
			},
		},
		defaultVariants: {
			error: 'auto',
		},
	},
);
type InputVariants = VariantProps<typeof inputVariants>;

@Directive({
	selector: '[hlmInput]',
	hostDirectives: [BrnFieldControl],
})
export class HlmInput {
	private readonly _fieldControl = inject(BrnFieldControl);
	private readonly _additionalClasses = signal<ClassValue>('');

	public readonly error = input<InputVariants['error']>('auto');

	protected readonly _state = linkedSignal(() => ({ error: this.error() }));

	public readonly errorState = computed(() => this._fieldControl.spartanInvalid() ?? false);

	constructor() {
		classes(() => [inputVariants({ error: this._state().error }), this._additionalClasses()]);

		effect(() => {
			const spartanInvalid = this._fieldControl.spartanInvalid();
			if (spartanInvalid != null) {
				this.setError(spartanInvalid ? true : 'auto');
			}
		});
	}

	setError(error: InputVariants['error']) {
		this._state.set({ error });
	}

	setClass(classes: string): void {
		this._additionalClasses.set(classes);
	}
}

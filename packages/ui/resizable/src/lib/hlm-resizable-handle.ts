import { ChangeDetectionStrategy, Component, computed, ElementRef, inject } from '@angular/core';
import { BrnResizableGroup, BrnResizableHandle } from '@spartan-ng/brain/resizable';
import { classes } from '@spartan-ng/helm/utils';

@Component({
	selector: 'hlm-resizable-handle',
	exportAs: 'hlmResizableHandle',
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [{ directive: BrnResizableHandle, inputs: ['withHandle', 'disabled'] }],
	host: {
		'data-slot': 'resizable-handle',
		// A focusable separator is a window splitter: it needs a value (the size of the panel before it, in %).
		'[attr.aria-valuenow]': '_valueNow()',
		'aria-valuemin': '0',
		'aria-valuemax': '100',
	},
	template: `
		@if (_brnResizableHandle.withHandle()) {
			<div class="spartan-resizable-handle-icon z-10 flex shrink-0"></div>
		}
	`,
})
export class HlmResizableHandle {
	protected readonly _brnResizableHandle = inject(BrnResizableHandle);

	private readonly _group = inject(BrnResizableGroup);
	private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

	/** The size of the panel before this handle, in % (the group's layout is in panel order). */
	protected readonly _valueNow = computed(() => {
		const layout = this._group.layout();
		const host = this._host.nativeElement;
		const panels = Array.from(host.parentElement?.querySelectorAll('[data-slot="resizable-panel"]') ?? []);
		const size = layout[panels.indexOf(host.previousElementSibling as Element)];
		return size === undefined ? null : Math.round(size);
	});

	constructor() {
		classes(() => [
			'bg-border ring-offset-background focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90',
			'data-[panel-group-direction=horizontal]:hover:cursor-ew-resize data-[panel-group-direction=vertical]:hover:cursor-ns-resize',
		]);
	}
}

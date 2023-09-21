import {
  ApplicationRef,
  ComponentFactoryResolver,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  HostListener,
  Inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { TooltipComponent } from './tooltip.component';
import { TooltipOptionsService } from './options.service';
import { backwardCompatibilityOptions, defaultOptions } from './options';
import { TooltipOptions } from './options.interface';

export interface AdComponent {
  data: any;
  show: boolean;
  close: boolean;
  events: any;
}

@Directive({
  selector: '[llTooltip]',
  exportAs: 'llTooltip',
})
export class TooltipDirective implements OnChanges, OnDestroy {
  hideTimeoutId!: number;
  destroyTimeoutId!: number;
  hideAfterClickTimeoutId!: number;
  createTimeoutId!: number;
  showTimeoutId!: number;
  componentRef: any;
  elementPosition: any;
  _id: any;
  _options: any = {};
  _defaultOptions: any;
  _destroyDelay!: number;
  componentSubscribe: any;
  _contentType: 'string' | 'html' | 'template' = 'string';
  _showDelay!: number;
  _hideDelay!: number;
  _zIndex!: number;
  _tooltipClass!: string;
  _animationDuration!: number;
  _maxWidth!: string;

  @Input() set options(value: TooltipOptions) {
    if (value && defaultOptions) {
      this._options = value;
    }
  }
  get options() {
    return this._options;
  }

  @Input('llTooltip') tooltipValue!: string | TemplateRef<any>;
  @Input() placement!: string;
  @Input() autoPlacement!: boolean;

  // Content type
  @Input() set contentType(value: 'string' | 'html' | 'template') {
    if (value) {
      this._contentType = value;
    }
  }
  get contentType() {
    return this._contentType;
  }

  @Input() hideDelayMobile!: number;
  @Input() hideDelayTouchscreen!: number;

  // z-index
  @Input() set zIndex(value: number) {
    if (value) {
      this._zIndex = value;
    }
  }
  get zIndex() {
    return this._zIndex;
  }

  // Animation duration
  @Input() set animationDuration(value: number) {
    if (value) {
      this._animationDuration = value;
    }
  }
  get animationDuration() {
    return this._animationDuration;
  }

  @Input() trigger!: string;

  // Tooltip class
  @Input() set tooltipClass(value: string) {
    if (value) {
      this._tooltipClass = value;
    }
  }
  get tooltipClass() {
    return this._tooltipClass;
  }

  @Input() display!: boolean;
  @Input() displayMobile!: boolean;
  @Input() displayTouchscreen!: boolean;
  @Input() shadow!: boolean;
  @Input() theme!: 'dark' | 'light';
  @Input() offset!: number;
  @Input() width!: string;

  // Max width
  @Input() set maxWidth(value: string) {
    if (value) {
      this._maxWidth = value;
    }
  }
  get maxWidth() {
    return this._maxWidth;
  }

  @Input() id: any;

  // Show delay
  @Input() set showDelay(value: number) {
    if (value) {
      this._showDelay = value;
    }
  }
  get showDelay() {
    return this._showDelay;
  }

  // Hide delay
  @Input() set hideDelay(value: number) {
    if (value) {
      this._hideDelay = value;
    }
  }
  get hideDelay() {
    return this._hideDelay;
  }

  @Input() hideDelayAfterClick!: number;
  @Input() pointerEvents!: 'auto' | 'none';
  @Input() position!: { top: number; left: number };

  get isTooltipDestroyed() {
    return this.componentRef && this.componentRef.hostView.destroyed;
  }

  get destroyDelay() {
    if (this._destroyDelay) {
      return this._destroyDelay;
    } else {
      return Number(this.getHideDelay()) + Number(this.options['animationDuration']);
    }
  }
  set destroyDelay(value: number) {
    this._destroyDelay = value;
  }

  get tooltipPosition() {
    if (this.options['position']) {
      return this.options['position'];
    } else {
      return this.elementPosition;
    }
  }

  @Output() events: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    @Optional() @Inject(TooltipOptionsService) private initOptions: any,
    private elementRef: ElementRef,
    private componentFactoryResolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector
  ) {}

  @HostListener('focusin')
  @HostListener('mouseenter')
  onMouseEnter() {
    if (this.isDisplayOnHover == false) {
      return;
    }

    this.show();
  }

  @HostListener('focusout')
  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.options['trigger'] === 'hover') {
      this.destroyTooltip();
    }
  }

  @HostListener('click')
  onClick() {
    if (this.isDisplayOnClick == false) {
      return;
    }

    this.show();
    this.hideAfterClickTimeoutId = window.setTimeout(() => {
      this.destroyTooltip();
    }, this.options['hideDelayAfterClick']);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.initOptions = this.renameProperties(this.initOptions);
    let changedOptions = this.getProperties(changes);
    changedOptions = this.renameProperties(changedOptions);

    this.applyOptionsDefault(defaultOptions, changedOptions);
  }

  ngOnDestroy(): void {
    this.destroyTooltip({
      fast: true,
    });

    if (this.componentSubscribe) {
      this.componentSubscribe.unsubscribe();
    }
  }

  getShowDelay() {
    return this.options['showDelay'];
  }

  getHideDelay() {
    const hideDelay = this.options['hideDelay'];
    const hideDelayTouchscreen = this.options['hideDelayTouchscreen'];

    return this.isTouchScreen ? hideDelayTouchscreen : hideDelay;
  }

  getProperties(changes: SimpleChanges) {
    let directiveProperties: any = {};
    let customProperties: any = {};
    let allProperties: any = {};

    for (var prop in changes) {
      if (prop !== 'options' && prop !== 'tooltipValue') {
        directiveProperties[prop] = changes[prop].currentValue;
      }
      if (prop === 'options') {
        customProperties = changes[prop].currentValue;
      }
    }

    allProperties = Object.assign({}, customProperties, directiveProperties);
    return allProperties;
  }

  renameProperties(options: any) {
    for (var prop in options) {
      if (backwardCompatibilityOptions[prop]) {
        options[backwardCompatibilityOptions[prop]] = options[prop];
        delete options[prop];
      }
    }

    return options;
  }

  getElementPosition(): void {
    this.elementPosition = this.elementRef.nativeElement.getBoundingClientRect();
  }

  createTooltip(): void {
    this.clearTimeouts();
    this.getElementPosition();

    this.createTimeoutId = window.setTimeout(() => {
      this.appendComponentToBody(TooltipComponent);
    }, this.getShowDelay());

    this.showTimeoutId = window.setTimeout(() => {
      this.showTooltipElem();
    }, this.getShowDelay());
  }

  destroyTooltip(
    options = {
      fast: false,
    }
  ): void {
    this.clearTimeouts();

    if (this.isTooltipDestroyed == false) {
      this.hideTimeoutId = window.setTimeout(
        () => {
          this.hideTooltip();
        },
        options.fast ? 0 : this.getHideDelay()
      );

      this.destroyTimeoutId = window.setTimeout(
        () => {
          if (!this.componentRef || this.isTooltipDestroyed) {
            return;
          }

          this.appRef.detachView(this.componentRef.hostView);
          this.componentRef.destroy();
          this.events.emit({
            type: 'hidden',
            position: this.tooltipPosition,
          });
        },
        options.fast ? 0 : this.destroyDelay
      );
    }
  }

  showTooltipElem(): void {
    this.clearTimeouts();
    (<AdComponent>this.componentRef.instance).show = true;
    this.events.emit({
      type: 'show',
      position: this.tooltipPosition,
    });
  }

  hideTooltip(): void {
    if (!this.componentRef || this.isTooltipDestroyed) {
      return;
    }
    (<AdComponent>this.componentRef.instance).show = false;
    this.events.emit({
      type: 'hide',
      position: this.tooltipPosition,
    });
  }

  appendComponentToBody(component: any, data: any = {}): void {
    this.componentRef = this.componentFactoryResolver.resolveComponentFactory(component).create(this.injector);

    (<AdComponent>this.componentRef.instance).data = {
      value: this.tooltipValue,
      element: this.elementRef.nativeElement,
      elementPosition: this.tooltipPosition,
      options: this.options,
    };
    this.appRef.attachView(this.componentRef.hostView);
    const domElem = (this.componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);

    this.componentSubscribe = (<AdComponent>this.componentRef.instance).events.subscribe((event: any) => {
      this.handleEvents(event);
    });
  }

  clearTimeouts(): void {
    if (this.createTimeoutId) {
      clearTimeout(this.createTimeoutId);
    }

    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
    }

    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
    }

    if (this.destroyTimeoutId) {
      clearTimeout(this.destroyTimeoutId);
    }
  }

  get isDisplayOnHover(): boolean {
    if (this.options['display'] == false) {
      return false;
    }

    if (this.options['displayTouchscreen'] == false && this.isTouchScreen) {
      return false;
    }

    if (this.options['trigger'] !== 'hover') {
      return false;
    }

    return true;
  }

  get isDisplayOnClick(): boolean {
    if (this.options['display'] == false) {
      return false;
    }

    if (this.options['displayTouchscreen'] == false && this.isTouchScreen) {
      return false;
    }

    if (this.options['trigger'] != 'click') {
      return false;
    }

    return true;
  }

  get isTouchScreen() {
    var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
    var mq = function (query: any) {
      return window.matchMedia(query).matches;
    };

    if ('ontouchstart' in window) {
      return true;
    }

    // include the 'heartz' as a way to have a non matching MQ to help terminate the join
    // https://git.io/vznFH
    var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
    return mq(query);
  }

  applyOptionsDefault(defaultOptions: any, options: any): void {
    this.options = Object.assign({}, defaultOptions, this.initOptions || {}, this.options, options);
  }

  handleEvents(event: any) {
    if (event.type === 'shown') {
      this.events.emit({
        type: 'shown',
        position: this.tooltipPosition,
      });
    }
  }

  public show() {
    if (!this.tooltipValue) {
      return;
    }

    if (!this.componentRef || this.isTooltipDestroyed) {
      this.createTooltip();
    } else if (!this.isTooltipDestroyed) {
      this.showTooltipElem();
    }
  }

  public hide() {
    this.destroyTooltip();
  }
}

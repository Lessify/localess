import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideCircleCheck, lucideCircleX, lucideFullscreen, lucideRefreshCcw } from '@ng-icons/lucide';
import { tablerDeviceDesktop, tablerDeviceLaptop, tablerDeviceMobile, tablerDeviceTablet } from '@ng-icons/tabler-icons';
import { ContentDocument } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SpaceEnvironment } from '@shared/models/space.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { EventToApp, EventToEditor } from '../edit-document/edit-document.model';

@Component({
  selector: 'll-content-preview',
  templateUrl: './content-preview.component.html',
  styleUrls: ['./content-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:message)': 'onWindowMessage($event)',
  },
  imports: [
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmDropdownMenuImports,
    HlmButtonGroupImports,
    HlmInputGroupImports,
    HlmSpinnerImports,
    HlmToggleGroupImports,
  ],
  providers: [
    provideIcons({
      lucideRefreshCcw,
      lucideChevronDown,
      lucideFullscreen,
      lucideCircleCheck,
      lucideCircleX,
      tablerDeviceMobile,
      tablerDeviceTablet,
      tablerDeviceLaptop,
      tablerDeviceDesktop,
    }),
  ],
})
export class ContentPreviewComponent {
  readonly spaceStore = inject(SpaceStore);
  readonly settingsStore = inject(LocalSettingsStore);
  private readonly sanitizer = inject(DomSanitizer);

  // Inputs
  readonly document = input.required<ContentDocument>();
  readonly selectedLocale = input.required<Locale>();
  readonly resizing = input(false);

  // Outputs
  readonly connected = output<void>();
  readonly schemaSelect = output<{ id: string; schema: string; field?: string }>();
  readonly schemaHover = output<{ id: string; schema: string; field?: string }>();
  readonly schemaLeave = output<void>();

  readonly preview = viewChild<ElementRef<HTMLIFrameElement>>('preview');

  readonly selectedSpace = computed(() => this.spaceStore.selectedSpace());
  readonly availableEnvironments = computed(() => this.selectedSpace()?.environments || []);
  readonly selectedEnvironment = linkedSignal<SpaceEnvironment | undefined>(() => {
    const envs = this.availableEnvironments();
    if (envs.length > 0) {
      return envs[0];
    } else {
      return undefined;
    }
  });
  readonly iframeUrl = computed(() => {
    const env = this.selectedEnvironment();
    const locale = this.selectedLocale();
    if (env) {
      const localePart = locale.id !== CONTENT_DEFAULT_LOCALE.id ? locale.id + '/' : '';
      return this.sanitizer.bypassSecurityTrustResourceUrl(`${env.url}${localePart}${this.document().fullSlug}`);
    } else {
      return undefined;
    }
  });

  readonly iframeStatus = linkedSignal<'loading' | 'loaded' | 'connected' | 'error'>(() => {
    this.iframeUrl();
    return 'loading';
  });

  constructor() {
    let initialized = false;
    effect(() => {
      const envs = this.availableEnvironments();
      if (initialized || envs.length === 0) return;
      initialized = true;
      const storedEnvironment = this.spaceStore.environment();
      if (storedEnvironment) {
        const environment = envs.find(it => it.name === storedEnvironment.name) ?? envs[0];
        this.selectedEnvironment.set(environment);
      }
    });
  }

  sendEvent(event: EventToApp): void {
    const contentWindow = this.preview()?.nativeElement.contentWindow;
    const selectedEnvironment = this.selectedEnvironment();
    if (contentWindow && selectedEnvironment && this.iframeStatus() === 'connected') {
      const url = new URL(selectedEnvironment.url);
      contentWindow.postMessage(event, url.origin);
    }
  }

  onWindowMessage(event: MessageEvent<EventToEditor>): void {
    if (event.isTrusted && event.data && event.data.owner === 'LOCALESS') {
      if (event.data.type === 'ping') {
        this.iframeStatus.set('connected');
        this.sendEvent({ type: 'pong' });
        this.connected.emit();
        return;
      }
      const { id, type, schema, field } = event.data;
      if (type === 'selectSchema') {
        this.schemaSelect.emit({ id, schema, field });
      } else if (type === 'hoverSchema') {
        this.schemaHover.emit({ id, schema, field });
      } else if (type === 'leaveSchema') {
        this.schemaLeave.emit();
      }
    }
  }

  onIframeLoad(): void {
    if (this.iframeStatus() === 'loading') {
      this.iframeStatus.set('loaded');
    }
  }

  onIframeError(): void {
    this.iframeStatus.set('error');
  }

  protected reloadEnvironment() {
    const environment = this.selectedEnvironment();
    this.selectedEnvironment.set(undefined);
    this.selectedEnvironment.set(environment);
  }

  protected onEnvironmentSelection(environment: SpaceEnvironment): void {
    this.selectedEnvironment.set(environment);
    this.spaceStore.changeEnvironment(environment);
  }
}

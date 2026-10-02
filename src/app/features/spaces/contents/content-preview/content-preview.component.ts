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
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideCircleCheck, lucideFullscreen, lucideInfo, lucideRefreshCcw, lucideX } from '@ng-icons/lucide';
import { tablerDeviceDesktop, tablerDeviceLaptop, tablerDeviceMobile, tablerDeviceTablet } from '@ng-icons/tabler-icons';
import { ContentDocument } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SpaceEnvironment } from '@shared/models/space.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { isSafePreviewUrl } from '@shared/validators/space.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { EventToApp, EventToEditor } from '../edit-document/edit-document.model';

// How long a loaded page may stay silent before the editor explains how to connect it.
const CONNECTION_HINT_DELAY = 3000;
// How long the page's blocks must stay mismatched before the editor says so; pages render in steps.
const DOCUMENT_HINT_DELAY = 1000;

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
      lucideInfo,
      lucideX,
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
  readonly documentBlockIds = input<ReadonlySet<string>>(new Set());
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
  // The URL is read from the space document, which can be written without going through the
  // settings form, so it is checked again here before being trusted as an iframe source.
  readonly invalidEnvironmentUrl = computed(() => {
    const env = this.selectedEnvironment();
    return env !== undefined && !isSafePreviewUrl(env.url);
  });
  readonly iframeUrl = computed(() => {
    const env = this.selectedEnvironment();
    const locale = this.selectedLocale();
    if (env && isSafePreviewUrl(env.url)) {
      const localePart = locale.id !== CONTENT_DEFAULT_LOCALE.id ? locale.id + '/' : '';
      return this.sanitizer.bypassSecurityTrustResourceUrl(`${env.url}${localePart}${this.document().fullSlug}`);
    } else {
      return undefined;
    }
  });

  readonly iframeStatus = linkedSignal<'loading' | 'loaded' | 'connected'>(() => {
    this.iframeUrl();
    return 'loading';
  });
  readonly connectionHintVisible = signal(false);
  // The top-level block ids the connected page reported; undefined until it reports.
  readonly pageBlocks = linkedSignal<string[] | undefined>(() => {
    this.iframeUrl();
    return undefined;
  });
  readonly pageMismatch = computed<'other-document' | 'no-blocks' | undefined>(() => {
    const blocks = this.pageBlocks();
    if (this.iframeStatus() !== 'connected' || blocks === undefined) return undefined;
    if (blocks.length === 0) return 'no-blocks';
    const documentBlockIds = this.documentBlockIds();
    return blocks.some(id => documentBlockIds.has(id)) ? undefined : 'other-document';
  });
  readonly documentHint = signal<'other-document' | 'no-blocks' | undefined>(undefined);

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
    effect(onCleanup => {
      if (this.iframeStatus() !== 'loaded') {
        this.connectionHintVisible.set(false);
        return;
      }
      const timer = setTimeout(() => this.connectionHintVisible.set(true), CONNECTION_HINT_DELAY);
      onCleanup(() => clearTimeout(timer));
    });
    effect(onCleanup => {
      const mismatch = this.pageMismatch();
      if (mismatch === undefined) {
        this.documentHint.set(undefined);
        return;
      }
      const timer = setTimeout(() => this.documentHint.set(mismatch), DOCUMENT_HINT_DELAY);
      onCleanup(() => clearTimeout(timer));
    });
  }

  sendEvent(event: EventToApp): void {
    const contentWindow = this.preview()?.nativeElement.contentWindow;
    const selectedEnvironment = this.selectedEnvironment();
    if (contentWindow && selectedEnvironment && isSafePreviewUrl(selectedEnvironment.url) && this.iframeStatus() === 'connected') {
      const url = new URL(selectedEnvironment.url);
      contentWindow.postMessage(event, url.origin);
    }
  }

  onWindowMessage(event: MessageEvent<EventToEditor>): void {
    // Only the preview iframe, on the selected environment's origin, may drive the editor - not
    // another tab, popup or frame that happens to post a LOCALESS-shaped message.
    const env = this.selectedEnvironment();
    const contentWindow = this.preview()?.nativeElement.contentWindow;
    if (!env || !isSafePreviewUrl(env.url) || !contentWindow) return;
    if (event.source !== contentWindow || event.origin !== new URL(env.url).origin) return;
    if (event.isTrusted && event.data && event.data.owner === 'LOCALESS') {
      if (event.data.type === 'ping') {
        this.iframeStatus.set('connected');
        this.sendEvent({ type: 'pong' });
        this.connected.emit();
        return;
      }
      if (event.data.type === 'unload') {
        // A ping can arrive before the iframe's load event, so the status can't be reset on load;
        // the leaving page says so instead, and the next page has to ping again.
        this.iframeStatus.set('loading');
        this.pageBlocks.set(undefined);
        return;
      }
      if (event.data.type === 'blocks') {
        this.pageBlocks.set(event.data.ids);
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

  dismissConnectionHint(): void {
    this.connectionHintVisible.set(false);
  }

  dismissDocumentHint(): void {
    this.documentHint.set(undefined);
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

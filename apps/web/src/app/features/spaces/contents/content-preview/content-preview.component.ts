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
import { resolvePreviewUrl } from '@core/utils/preview-url';
import { CONTENT_DEFAULT_LOCALE, ContentDocument, Locale, SpaceEnvironment } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideCircleCheck, lucideFullscreen, lucideInfo, lucideRefreshCcw, lucideX } from '@ng-icons/lucide';
import { tablerDeviceDesktop, tablerDeviceLaptop, tablerDeviceMobile, tablerDeviceTablet } from '@ng-icons/tabler-icons';
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
import { BlockAction } from '../shared/block-actions';

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
  readonly blockAction = output<{ id: string; action: BlockAction }>();

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
  // The environment URL filled in for this document and locale; it may be a pattern like
  // `https://{locale}.site.com/{fullSlug}`, so it is only checked once resolved.
  readonly previewUrl = computed(() => {
    const env = this.selectedEnvironment();
    if (!env) return undefined;
    const document = this.document();
    return resolvePreviewUrl(env.url, {
      documentId: document.id,
      fullSlug: document.fullSlug,
      slug: document.slug ?? '',
      parentSlug: document.parentSlug ?? '',
      localeId: this.selectedLocale().id,
      fallbackLocaleId: this.selectedSpace()?.localeFallback?.id ?? CONTENT_DEFAULT_LOCALE.id,
    });
  });
  readonly safePreviewUrl = computed(() => {
    const url = this.previewUrl();
    return isSafePreviewUrl(url) ? url : undefined;
  });
  // Messages are exchanged only with the resolved URL's origin.
  readonly previewOrigin = computed(() => {
    const url = this.safePreviewUrl();
    return url ? new URL(url).origin : undefined;
  });
  readonly invalidEnvironmentUrl = computed(() => this.previewUrl() !== undefined && this.safePreviewUrl() === undefined);
  readonly iframeUrl = computed(() => {
    const url = this.safePreviewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : undefined;
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
  // What the connected page's sync script reported about itself in its ping.
  readonly pageSync = linkedSignal<{ protocol?: number; sdk?: string; scriptOrigin?: string } | undefined>(() => {
    this.iframeUrl();
    return undefined;
  });
  readonly connectedTooltip = computed(() => {
    const sync = this.pageSync();
    if (!sync) return 'Connected to Localess SDK';
    if (sync.protocol === undefined) return 'Connected · older sync script';
    return sync.sdk ? `Connected · ${sync.sdk.replace(/@(?=[^@]+$)/, ' ')}` : 'Connected to Localess SDK';
  });
  readonly editorOrigin = location.origin;
  // The page loads the sync script, and so talks to, a Localess deployment other than this editor.
  readonly scriptOriginMismatch = computed(() => {
    const scriptOrigin = this.pageSync()?.scriptOrigin;
    return scriptOrigin && scriptOrigin !== this.editorOrigin ? scriptOrigin : undefined;
  });
  readonly originHintDismissed = signal(false);

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
    const origin = this.previewOrigin();
    if (contentWindow && origin && this.iframeStatus() === 'connected') {
      contentWindow.postMessage(event, origin);
    }
  }

  onWindowMessage(event: MessageEvent<EventToEditor>): void {
    // Only the preview iframe, on the selected environment's origin, may drive the editor - not
    // another tab, popup or frame that happens to post a LOCALESS-shaped message.
    const origin = this.previewOrigin();
    const contentWindow = this.preview()?.nativeElement.contentWindow;
    if (!origin || !contentWindow) return;
    if (event.source !== contentWindow || event.origin !== origin) return;
    if (event.isTrusted && event.data && event.data.owner === 'LOCALESS') {
      if (event.data.type === 'ping') {
        const { protocol, sdk, scriptOrigin } = event.data;
        this.pageSync.set({ protocol, sdk, scriptOrigin });
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
        this.pageSync.set(undefined);
        return;
      }
      if (event.data.type === 'blocks') {
        this.pageBlocks.set(event.data.ids);
        return;
      }
      if (event.data.type === 'blockAction') {
        this.blockAction.emit({ id: event.data.id, action: event.data.action });
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

  dismissOriginHint(): void {
    this.originHintDismissed.set(true);
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

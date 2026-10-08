import { TestBed } from '@angular/core/testing';
import { ContentDocument, ContentKind } from '@shared/models/content.model';
import { Locale } from '@shared/models/locale.model';
import { Space, SpaceEnvironment } from '@shared/models/space.model';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { ContentPreviewComponent } from './content-preview.component';

const en: Locale = { id: 'en', name: 'English' };

function space(overrides: Partial<Space> = {}): Space {
  return { id: 'space-1', name: 'Space 1', locales: [en], localeFallback: en, environments: [], ...overrides } as Space;
}

function documentOf(): ContentDocument {
  return { id: 'doc1', kind: ContentKind.DOCUMENT, name: 'Doc', slug: 'doc', fullSlug: 'doc' } as unknown as ContentDocument;
}

const preview: SpaceEnvironment = { name: 'preview', url: 'https://preview.example.com/' };

function messageEvent(data: unknown, options: { isTrusted?: boolean; origin?: string; source?: unknown } = {}): MessageEvent {
  const { isTrusted = true, origin = 'https://preview.example.com', source } = options;
  return { isTrusted, data, origin, source } as MessageEvent;
}

describe('ContentPreviewComponent', () => {
  function setup(options: { selectedSpace?: Space; environment?: SpaceEnvironment } = {}) {
    const selectedSpace = options.selectedSpace ?? space();
    const changeEnvironment = vi.fn();

    TestBed.overrideComponent(ContentPreviewComponent, { set: { template: '<iframe #preview></iframe>' } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SpaceStore,
          useValue: { selectedSpace: signal(selectedSpace), environment: signal(options.environment), changeEnvironment },
        },
      ],
    });
    const fixture = TestBed.createComponent(ContentPreviewComponent);
    fixture.componentRef.setInput('document', documentOf());
    fixture.componentRef.setInput('selectedLocale', en);
    fixture.detectChanges();
    const frameWindow = fixture.componentInstance.preview()?.nativeElement.contentWindow;
    return { fixture, component: fixture.componentInstance, changeEnvironment, frameWindow };
  }

  it('restores the previously stored environment when available', () => {
    const prod: SpaceEnvironment = { name: 'prod', url: 'https://prod' };
    const staging: SpaceEnvironment = { name: 'staging', url: 'https://staging' };
    const { component } = setup({ selectedSpace: space({ environments: [staging, prod] }), environment: prod });

    expect(component.selectedEnvironment()).toEqual(prod);
  });

  it('onEnvironmentSelection() updates the selected environment and persists it', () => {
    const { component, changeEnvironment } = setup();
    const env: SpaceEnvironment = { name: 'staging', url: 'https://staging' };

    component['onEnvironmentSelection'](env);

    expect(component.selectedEnvironment()).toEqual(env);
    expect(changeEnvironment).toHaveBeenCalledWith(env);
  });

  it('onIframeLoad() transitions from loading to loaded', () => {
    const { component } = setup();

    component.onIframeLoad();

    expect(component.iframeStatus()).toBe('loaded');
  });

  describe('connection hint', () => {
    afterEach(() => vi.useRealTimers());

    it('appears when a loaded page has not connected after 3s, and can be dismissed', () => {
      vi.useFakeTimers();
      const { component } = setup();

      component.onIframeLoad();
      TestBed.tick();
      vi.advanceTimersByTime(2900);
      expect(component.connectionHintVisible()).toBe(false);
      vi.advanceTimersByTime(100);
      expect(component.connectionHintVisible()).toBe(true);

      component.dismissConnectionHint();
      expect(component.connectionHintVisible()).toBe(false);
    });

    it('hides once the page connects', () => {
      vi.useFakeTimers();
      const { component, frameWindow } = setup({ selectedSpace: space({ environments: [preview] }) });
      vi.spyOn(frameWindow as Window, 'postMessage').mockImplementation(() => undefined);

      component.onIframeLoad();
      TestBed.tick();
      vi.advanceTimersByTime(3000);
      expect(component.connectionHintVisible()).toBe(true);

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: frameWindow }));
      TestBed.tick();
      expect(component.connectionHintVisible()).toBe(false);
    });
  });

  describe('document hint', () => {
    afterEach(() => vi.useRealTimers());

    function connectedPreview(documentBlockIds: string[]) {
      vi.useFakeTimers();
      const result = setup({ selectedSpace: space({ environments: [preview] }) });
      vi.spyOn(result.frameWindow as Window, 'postMessage').mockImplementation(() => undefined);
      result.fixture.componentRef.setInput('documentBlockIds', new Set(documentBlockIds));
      result.component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: result.frameWindow }));
      const reportBlocks = (ids: string[]) =>
        result.component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'blocks', ids }, { source: result.frameWindow }));
      const settle = (ms: number) => {
        TestBed.tick();
        vi.advanceTimersByTime(ms);
      };
      return { ...result, reportBlocks, settle };
    }

    it('stays hidden while the page shows a block of the open document', () => {
      const { component, reportBlocks, settle } = connectedPreview(['root', 'hero']);

      reportBlocks(['header', 'hero']);
      settle(2000);

      expect(component.documentHint()).toBeUndefined();
    });

    it('says the page shows another document after 1s, and clears once it shows this one', () => {
      const { component, reportBlocks, settle } = connectedPreview(['root', 'hero']);

      reportBlocks(['other-root']);
      settle(900);
      expect(component.documentHint()).toBeUndefined();
      settle(100);
      expect(component.documentHint()).toBe('other-document');

      reportBlocks(['root']);
      settle(0);
      expect(component.documentHint()).toBeUndefined();
    });

    it('says the page has no editable blocks, and can be dismissed', () => {
      const { component, reportBlocks, settle } = connectedPreview(['root']);

      reportBlocks([]);
      settle(1000);
      expect(component.documentHint()).toBe('no-blocks');

      component.dismissDocumentHint();
      expect(component.documentHint()).toBeUndefined();
    });

    it('forgets the reported blocks when the page unloads', () => {
      const { component, frameWindow, reportBlocks, settle } = connectedPreview(['root']);
      reportBlocks(['other-root']);
      settle(1000);

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'unload' }, { source: frameWindow }));
      settle(0);

      expect(component.pageBlocks()).toBeUndefined();
      expect(component.documentHint()).toBeUndefined();
    });
  });

  describe('page sync info', () => {
    function pingWith(data: Record<string, unknown>) {
      const result = setup({ selectedSpace: space({ environments: [preview] }) });
      vi.spyOn(result.frameWindow as Window, 'postMessage').mockImplementation(() => undefined);
      result.component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping', ...data }, { source: result.frameWindow }));
      return result;
    }

    it('shows the reported SDK in the connected tooltip', () => {
      const { component } = pingWith({ protocol: 1, sdk: '@localess/react@4.0.3', scriptOrigin: location.origin });

      expect(component.connectedTooltip()).toBe('Connected · @localess/react 4.0.3');
      expect(component.scriptOriginMismatch()).toBeUndefined();
    });

    it('marks a page running an older sync script', () => {
      const { component } = pingWith({});

      expect(component.connectedTooltip()).toBe('Connected · older sync script');
    });

    it('flags a script loaded from another Localess deployment, until dismissed', () => {
      const { component } = pingWith({ protocol: 1, scriptOrigin: 'https://localess-prod.web.app' });

      expect(component.scriptOriginMismatch()).toBe('https://localess-prod.web.app');
      component.dismissOriginHint();
      expect(component.originHintDismissed()).toBe(true);
    });

    it('forgets the page sync info when the page unloads', () => {
      const { component, frameWindow } = pingWith({ protocol: 1, scriptOrigin: 'https://localess-prod.web.app' });

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'unload' }, { source: frameWindow }));

      expect(component.pageSync()).toBeUndefined();
      expect(component.scriptOriginMismatch()).toBeUndefined();
    });
  });

  describe('preview URL safety', () => {
    it.each([['javascript:alert(document.domain)//'], ['data:text/html,<script>alert(1)</script>'], ['/relative/path'], ['not a url']])(
      'does not load %s and flags the environment as invalid',
      url => {
        const { component } = setup({ selectedSpace: space({ environments: [{ name: 'bad', url }] }) });

        expect(component.iframeUrl()).toBeUndefined();
        expect(component.invalidEnvironmentUrl()).toBe(true);
      },
    );

    it('does not load a URL on the app origin', () => {
      const { component } = setup({ selectedSpace: space({ environments: [{ name: 'self', url: `${location.origin}/page/` }] }) });

      expect(component.iframeUrl()).toBeUndefined();
      expect(component.invalidEnvironmentUrl()).toBe(true);
    });

    it('loads an http(s) URL of another origin', () => {
      const { component } = setup({ selectedSpace: space({ environments: [preview] }) });

      expect(component.iframeUrl()).toBeDefined();
      expect(component.invalidEnvironmentUrl()).toBe(false);
    });

    it('fills a URL pattern, and talks only to the resolved origin', () => {
      const pattern: SpaceEnvironment = { name: 'localized', url: 'https://{locale}.preview.example.com/{fullSlug}/' };
      const { component, frameWindow, fixture } = setup({ selectedSpace: space({ environments: [pattern] }) });
      fixture.componentRef.setInput('selectedLocale', { id: 'de', name: 'German' });
      const postMessage = vi.spyOn(frameWindow as Window, 'postMessage').mockImplementation(() => undefined);

      expect(component.previewUrl()).toBe('https://de.preview.example.com/doc/');
      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: frameWindow }));
      expect(component.iframeStatus()).not.toBe('connected');
      component.onWindowMessage(
        messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: frameWindow, origin: 'https://de.preview.example.com' }),
      );

      expect(component.iframeStatus()).toBe('connected');
      expect(postMessage).toHaveBeenCalledWith({ type: 'pong' }, 'https://de.preview.example.com');
    });

    it('uses the space fallback locale for {locale} on the default locale', () => {
      const pattern: SpaceEnvironment = { name: 'query', url: 'https://preview.example.com/{fullSlug}?lang={locale}' };
      const { component, fixture } = setup({ selectedSpace: space({ environments: [pattern] }) });
      fixture.componentRef.setInput('selectedLocale', { id: 'default', name: 'Default' });

      expect(component.previewUrl()).toBe('https://preview.example.com/doc?lang=en');
    });
  });

  describe('onWindowMessage', () => {
    function setupWithPreview() {
      return setup({ selectedSpace: space({ environments: [preview] }) });
    }

    it('ignores untrusted or foreign messages', () => {
      const { component, frameWindow } = setupWithPreview();

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { isTrusted: false, source: frameWindow }));
      expect(component.iframeStatus()).not.toBe('connected');

      component.onWindowMessage(messageEvent({ owner: 'OTHER', type: 'ping' }, { source: frameWindow }));
      expect(component.iframeStatus()).not.toBe('connected');
    });

    it('ignores messages from another origin', () => {
      const { component, frameWindow } = setupWithPreview();

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { origin: 'https://evil.example', source: frameWindow }));

      expect(component.iframeStatus()).not.toBe('connected');
    });

    it('ignores messages from a window other than the preview iframe', () => {
      const { component } = setupWithPreview();

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: {} }));

      expect(component.iframeStatus()).not.toBe('connected');
    });

    it('marks the iframe connected and emits connected on ping', () => {
      const { component, frameWindow } = setupWithPreview();
      const postMessage = vi.spyOn(frameWindow as Window, 'postMessage').mockImplementation(() => undefined);
      const spy = vi.fn();
      component.connected.subscribe(spy);

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: frameWindow }));

      expect(component.iframeStatus()).toBe('connected');
      expect(spy).toHaveBeenCalled();
      // The pong goes only to the environment's origin.
      expect(postMessage).toHaveBeenCalledWith({ type: 'pong' }, 'https://preview.example.com');
    });

    it('goes back to loading when the connected page unloads, and stops sending to it', () => {
      const { component, frameWindow } = setupWithPreview();
      const postMessage = vi.spyOn(frameWindow as Window, 'postMessage').mockImplementation(() => undefined);
      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: frameWindow }));

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'unload' }, { source: frameWindow }));
      component.sendEvent({ type: 'save', documentId: 'doc1' });

      expect(component.iframeStatus()).toBe('loading');
      expect(postMessage).toHaveBeenCalledTimes(1); // only the pong
    });

    it('stays connected when the next page pings before its load event fires', () => {
      const { component, frameWindow } = setupWithPreview();
      vi.spyOn(frameWindow as Window, 'postMessage').mockImplementation(() => undefined);
      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: frameWindow }));
      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'unload' }, { source: frameWindow }));

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, { source: frameWindow }));
      component.onIframeLoad();

      expect(component.iframeStatus()).toBe('connected');
    });

    it('emits schemaSelect/schemaHover/schemaLeave with the parsed payload', () => {
      const { component, frameWindow } = setupWithPreview();
      const select = vi.fn();
      const hover = vi.fn();
      const leave = vi.fn();
      component.schemaSelect.subscribe(select);
      component.schemaHover.subscribe(hover);
      component.schemaLeave.subscribe(leave);

      component.onWindowMessage(
        messageEvent({ owner: 'LOCALESS', type: 'selectSchema', id: 'c1', schema: 's1', field: 'title' }, { source: frameWindow }),
      );
      expect(select).toHaveBeenCalledWith({ id: 'c1', schema: 's1', field: 'title' });

      component.onWindowMessage(
        messageEvent({ owner: 'LOCALESS', type: 'hoverSchema', id: 'c1', schema: 's1', field: 'title' }, { source: frameWindow }),
      );
      expect(hover).toHaveBeenCalledWith({ id: 'c1', schema: 's1', field: 'title' });

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'leaveSchema', id: 'c1', schema: 's1' }, { source: frameWindow }));
      expect(leave).toHaveBeenCalled();
    });

    it('emits blockAction with the block id and action', () => {
      const { component, frameWindow } = setupWithPreview();
      const blockAction = vi.fn();
      component.blockAction.subscribe(blockAction);

      component.onWindowMessage(
        messageEvent({ owner: 'LOCALESS', type: 'blockAction', id: 'c1', action: 'moveUp' }, { source: frameWindow }),
      );

      expect(blockAction).toHaveBeenCalledWith({ id: 'c1', action: 'moveUp' });
    });
  });
});

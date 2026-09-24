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
    return { component: fixture.componentInstance, changeEnvironment, frameWindow };
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

  it('onIframeError() sets the error status', () => {
    const { component } = setup();

    component.onIframeError();

    expect(component.iframeStatus()).toBe('error');
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

    it('emits schemaSelect/schemaHover/schemaLeave with the parsed payload', () => {
      const { component, frameWindow } = setupWithPreview();
      const select = vi.fn();
      const hover = vi.fn();
      const leave = vi.fn();
      component.schemaSelect.subscribe(select);
      component.schemaHover.subscribe(hover);
      component.schemaLeave.subscribe(leave);

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'selectSchema', id: 'c1', schema: 's1', field: 'title' }, { source: frameWindow }));
      expect(select).toHaveBeenCalledWith({ id: 'c1', schema: 's1', field: 'title' });

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'hoverSchema', id: 'c1', schema: 's1', field: 'title' }, { source: frameWindow }));
      expect(hover).toHaveBeenCalledWith({ id: 'c1', schema: 's1', field: 'title' });

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'leaveSchema', id: 'c1', schema: 's1' }, { source: frameWindow }));
      expect(leave).toHaveBeenCalled();
    });
  });
});

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

function messageEvent(data: unknown, isTrusted = true): MessageEvent {
  return { isTrusted, data } as MessageEvent;
}

describe('ContentPreviewComponent', () => {
  function setup(options: { selectedSpace?: Space; environment?: SpaceEnvironment } = {}) {
    const selectedSpace = options.selectedSpace ?? space();
    const changeEnvironment = vi.fn();

    TestBed.overrideComponent(ContentPreviewComponent, { set: { template: '<div></div>' } });
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
    return { component: fixture.componentInstance, changeEnvironment };
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

  describe('onWindowMessage', () => {
    it('ignores untrusted or foreign messages', () => {
      const { component } = setup();

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }, false));
      expect(component.iframeStatus()).not.toBe('connected');

      component.onWindowMessage(messageEvent({ owner: 'OTHER', type: 'ping' }));
      expect(component.iframeStatus()).not.toBe('connected');
    });

    it('marks the iframe connected and emits connected on ping', () => {
      const { component } = setup();
      const spy = vi.fn();
      component.connected.subscribe(spy);

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'ping' }));

      expect(component.iframeStatus()).toBe('connected');
      expect(spy).toHaveBeenCalled();
    });

    it('emits schemaSelect/schemaHover/schemaLeave with the parsed payload', () => {
      const { component } = setup();
      const select = vi.fn();
      const hover = vi.fn();
      const leave = vi.fn();
      component.schemaSelect.subscribe(select);
      component.schemaHover.subscribe(hover);
      component.schemaLeave.subscribe(leave);

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'selectSchema', id: 'c1', schema: 's1', field: 'title' }));
      expect(select).toHaveBeenCalledWith({ id: 'c1', schema: 's1', field: 'title' });

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'hoverSchema', id: 'c1', schema: 's1', field: 'title' }));
      expect(hover).toHaveBeenCalledWith({ id: 'c1', schema: 's1', field: 'title' });

      component.onWindowMessage(messageEvent({ owner: 'LOCALESS', type: 'leaveSchema', id: 'c1', schema: 's1' }));
      expect(leave).toHaveBeenCalled();
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ContentDocument, ContentKind } from '@shared/models/content.model';
import { Locale } from '@shared/models/locale.model';
import { Schema, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { Space, SpaceEnvironment } from '@shared/models/space.model';
import { Token, TokenPermission } from '@shared/models/token.model';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { TokenService } from '@shared/services/token.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EditDocumentComponent } from './edit-document.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

const rootSchema: Schema = {
  id: 'root1',
  type: SchemaType.ROOT,
  fields: [{ name: 'child', kind: SchemaFieldKind.SCHEMA } as never],
} as unknown as Schema;

const childSchema: Schema = { id: 'child1', type: SchemaType.NODE, fields: [] } as unknown as Schema;

function space(overrides: Partial<Space> = {}): Space {
  return { id: 'space-1', name: 'Space 1', locales: [en, de], localeFallback: en, environments: [], ...overrides } as Space;
}

function documentOf(data?: object | string): ContentDocument {
  return {
    id: 'doc1',
    kind: ContentKind.DOCUMENT,
    name: 'Doc',
    slug: 'doc',
    fullSlug: 'doc',
    schema: 'root1',
    data,
    updatedAt: { seconds: 1000 },
  } as unknown as ContentDocument;
}

describe('EditDocumentComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function setup(
    document: ContentDocument,
    options: { schemas?: Schema[]; selectedSpace?: Space; environment?: SpaceEnvironment } = {},
  ) {
    const schemas = options.schemas ?? [rootSchema, childSchema];
    const selectedSpace = options.selectedSpace ?? space();

    const publish = vi.fn().mockReturnValue(of(undefined));
    const unpublish = vi.fn().mockReturnValue(of(undefined));
    const updateDocumentData = vi.fn().mockReturnValue(of(undefined));
    const translateLocale = vi.fn().mockReturnValue(of(undefined));
    const findFirstByPermission = vi.fn().mockReturnValue(of([{ id: 'token1' } as Token]));
    const isActionSave = vi.fn().mockReturnValue(false);
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();
    const changeEnvironment = vi.fn();

    TestBed.overrideComponent(EditDocumentComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: ContentService, useValue: { publish, unpublish, updateDocumentData, translateLocale } },
        { provide: TokenService, useValue: { findFirstByPermission } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: PlatformService, useValue: { isActionSave } },
        { provide: Router, useValue: { navigate } },
        { provide: MatDialog, useValue: { open } },
        {
          provide: SpaceStore,
          useValue: {
            documents: signal([]),
            schemas: signal(schemas),
            selectedSpace: signal(selectedSpace),
            environment: signal(options.environment),
            changeEnvironment,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(EditDocumentComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('contentId', 'doc1');
    fixture.componentRef.setInput('document', document);
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      publish,
      unpublish,
      updateDocumentData,
      translateLocale,
      findFirstByPermission,
      isActionSave,
      navigate,
      success,
      error,
      open,
      changeEnvironment,
    };
  }

  describe('ngOnInit', () => {
    it('generates a new document id/schema when the document has no data', () => {
      const { component } = setup(documentOf(undefined));

      expect(component.documentData._schema).toBe('root1');
      expect(component.documentData.schema).toBe('root1');
      expect(component.documentData._id).toBeTruthy();
    });

    it('parses stringified document data', () => {
      const data = JSON.stringify({ _id: 'd1', schema: 'root1' });
      const { component } = setup(documentOf(data));

      expect(component.documentData).toEqual({ _id: 'd1', schema: 'root1' });
    });

    it('clones object document data', () => {
      const data = { _id: 'd1', schema: 'root1' };
      const { component } = setup(documentOf(data));

      expect(component.documentData).toEqual(data);
      expect(component.documentData).not.toBe(data);
    });

    it('generates the document id tree including nested SCHEMA fields', () => {
      const data = { _id: 'root-id', schema: 'root1', child: { _id: 'child-id', schema: 'child1' } };
      const { component } = setup(documentOf(data));

      expect(component.documentIdsTree.get('root-id')).toEqual(['root-id']);
      expect(component.documentIdsTree.get('child-id')).toEqual(['root-id', 'child-id']);
    });

    it('restores the previously stored environment when available', () => {
      const prod: SpaceEnvironment = { name: 'prod', url: 'https://prod' };
      const staging: SpaceEnvironment = { name: 'staging', url: 'https://staging' };
      const { component } = setup(documentOf({ _id: 'd1', schema: 'root1' }), {
        selectedSpace: space({ environments: [staging, prod] }),
        environment: prod,
      });

      expect(component.selectedEnvironment()).toEqual(prod);
    });
  });

  describe('isFormDirty', () => {
    it('is false immediately after init', () => {
      const { component } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      expect(component.isFormDirty).toBe(false);
    });

    it('is true after the document data changes', () => {
      const { component } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.documentData['title'] = 'Changed';

      expect(component.isFormDirty).toBe(true);
    });
  });

  describe('publish / unpublish', () => {
    it('publish() notifies success and updates publishedAt, resetting loading after a delay', async () => {
      vi.useFakeTimers();
      const { component, publish, success } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.publish();

      expect(publish).toHaveBeenCalledWith('space-1', 'doc1');
      expect(success).toHaveBeenCalledWith('Content has been published.');
      expect(component.isPublishLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);
      expect(component.isPublishLoading()).toBe(false);
    });

    it('publish() notifies an error on failure', () => {
      const { component, publish, error } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      publish.mockReturnValue(throwError(() => new Error('boom')));

      component.publish();

      expect(error).toHaveBeenCalledWith('Content can not be published.');
    });

    it('unpublish() notifies success and clears publishedAt', () => {
      const { component, unpublish, success } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.unpublish();

      expect(unpublish).toHaveBeenCalledWith('space-1', 'doc1');
      expect(success).toHaveBeenCalledWith('Content has been unpublished.');
      expect(component.documentPublishedAt()).toBeUndefined();
    });
  });

  describe('save', () => {
    it('saves valid content and notifies success', async () => {
      vi.useFakeTimers();
      const { component, updateDocumentData, success } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.save();

      expect(updateDocumentData).toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith('Content has been saved in draft.');
      expect(component.isSaveLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);
      expect(component.isSaveLoading()).toBe(false);
    });

    it('notifies an error and does not save when content is invalid', () => {
      const requiredField = { name: 'title', kind: SchemaFieldKind.TEXT, required: true } as never;
      const invalidRootSchema: Schema = { id: 'root1', type: SchemaType.ROOT, fields: [requiredField] } as unknown as Schema;
      const { component, updateDocumentData, error } = setup(documentOf({ _id: 'd1', schema: 'root1' }), {
        schemas: [invalidRootSchema],
      });

      component.save();

      expect(updateDocumentData).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('Content is not valid. Please check all fields are filled correctly.');
      expect(component.isSaveLoading()).toBe(false);
    });

    it('notifies an error on a failed save', () => {
      const { component, updateDocumentData, error } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      updateDocumentData.mockReturnValue(throwError(() => new Error('boom')));

      component.save();

      expect(error).toHaveBeenCalledWith('Content can not be saved.');
    });
  });

  it('back() navigates to the contents list', () => {
    const { component, navigate } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

    component.back();

    expect(navigate).toHaveBeenCalledWith(['features', 'spaces', 'space-1', 'contents']);
  });

  describe('token-gated API links', () => {
    it('openDraftV1InNewTab() fetches a token then opens the link', () => {
      const { component, findFirstByPermission } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openDraftV1InNewTab('en');

      expect(findFirstByPermission).toHaveBeenCalledWith('space-1', TokenPermission.CONTENT_DRAFT);
      expect(openSpy).toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('openDraftV1InNewTab() reuses the cached token', () => {
      const { component, findFirstByPermission } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      component.openDraftV1InNewTab('en');
      findFirstByPermission.mockClear();

      component.openDraftV1InNewTab('de');

      expect(findFirstByPermission).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('openDraftV1InNewTab() notifies an error when no single token is available', () => {
      const { component, findFirstByPermission, error } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      findFirstByPermission.mockReturnValue(of([]));

      component.openDraftV1InNewTab('en');

      expect(error).toHaveBeenCalledWith('Please create Access Token with Content Draft Permission in your Space Settings');
    });

    it('openPublishedV1InNewTab() fetches a token then opens the link', () => {
      const { component, findFirstByPermission } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openPublishedV1InNewTab('en');

      expect(findFirstByPermission).toHaveBeenCalledWith('space-1', TokenPermission.CONTENT_PUBLIC);
      expect(openSpy).toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });

  describe('schema path navigation', () => {
    it('onSchemaChange()/navigateToSchemaForwards() pushes the path and selects the child data', () => {
      const data = { _id: 'root-id', schema: 'root1', child: { _id: 'child-id', schema: 'child1' } };
      const { component } = setup(documentOf(data));

      component.onSchemaChange({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });

      expect(component.schemaPath().map(it => it.contentId)).toEqual(['root-id', 'child-id']);
      expect(component.selectedDocumentData).toEqual(data.child);
    });

    it('navigateToSchemaBackwards() to the root restores the root document data', () => {
      const data = { _id: 'root-id', schema: 'root1', child: { _id: 'child-id', schema: 'child1' } };
      const { component } = setup(documentOf(data));
      component.navigateToSchemaForwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });

      component.navigateToSchemaBackwards({ contentId: 'root-id', schemaName: 'root1', fieldName: '' });

      expect(component.selectedDocumentData).toEqual(data);
      expect(component.schemaPath()).toHaveLength(1);
    });
  });

  it('captureKeyboard() saves and prevents default on Ctrl/Cmd+S', () => {
    const { component, isActionSave, updateDocumentData } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
    isActionSave.mockReturnValue(true);
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(updateDocumentData).toHaveBeenCalled();
  });

  it('captureKeyboard() does nothing for other key combinations', () => {
    const { component, updateDocumentData } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.captureKeyboard(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(updateDocumentData).not.toHaveBeenCalled();
  });

  describe('iframe / environment', () => {
    it('onIframeLoad() transitions from loading to loaded', () => {
      const { component } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.onIframeLoad();

      expect(component.iframeStatus()).toBe('loaded');
    });

    it('onIframeError() sets the error status', () => {
      const { component } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.onIframeError();

      expect(component.iframeStatus()).toBe('error');
    });

    it('onEnvironmentSelection() updates the selected environment and persists it', () => {
      const { component, changeEnvironment } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      const env: SpaceEnvironment = { name: 'staging', url: 'https://staging' };

      component['onEnvironmentSelection'](env);

      expect(component.selectedEnvironment()).toEqual(env);
      expect(changeEnvironment).toHaveBeenCalledWith(env);
    });
  });

  describe('contentIdLink', () => {
    function messageEvent(data: unknown, isTrusted = true): MessageEvent {
      return { isTrusted, data } as MessageEvent;
    }

    it('ignores untrusted or foreign messages', () => {
      const { component } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.contentIdLink(messageEvent({ owner: 'LOCALESS', type: 'ping' }, false));
      expect(component.iframeStatus()).not.toBe('connected');

      component.contentIdLink(messageEvent({ owner: 'OTHER', type: 'ping' }));
      expect(component.iframeStatus()).not.toBe('connected');
    });

    it('marks the iframe connected on ping', () => {
      const { component } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

      component.contentIdLink(messageEvent({ owner: 'LOCALESS', type: 'ping' }));

      expect(component.iframeStatus()).toBe('connected');
    });

    it('tracks hover and leave schema events', () => {
      const data = { _id: 'root-id', schema: 'root1', child: { _id: 'child-id', schema: 'child1' } };
      const { component } = setup(documentOf(data));

      component.contentIdLink(messageEvent({ owner: 'LOCALESS', type: 'hoverSchema', id: 'child-id', field: 'title' }));
      expect(component.hoverSchemaPath()).toEqual(['root-id', 'child-id']);
      expect(component.hoverSchemaField()).toBe('title');

      component.contentIdLink(messageEvent({ owner: 'LOCALESS', type: 'leaveSchema', id: 'child-id' }));
      expect(component.hoverSchemaPath()).toBeUndefined();
      expect(component.hoverSchemaField()).toBeUndefined();
    });
  });

  it('copiedSlug()/copiedFullSlug() notify success', () => {
    const { component, success } = setup(documentOf({ _id: 'd1', schema: 'root1' }));

    component.copiedSlug();
    component.copiedFullSlug();

    expect(success).toHaveBeenNthCalledWith(1, 'Slug copied to clipboard.');
    expect(success).toHaveBeenNthCalledWith(2, 'Full Slug copied to clipboard.');
  });

  describe('openTranslateLocaleDialog', () => {
    it('translates the locale and notifies success when confirmed', () => {
      const { component, open, translateLocale, success } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: 'en', targetLocale: 'de' }) });

      component.openTranslateLocaleDialog();

      expect(translateLocale).toHaveBeenCalledWith('space-1', 'doc1', 'en', 'de');
      expect(success).toHaveBeenCalledWith('Locale Translate run with success.');
    });

    it('notifies an error on failure', () => {
      const { component, open, translateLocale, error } = setup(documentOf({ _id: 'd1', schema: 'root1' }));
      translateLocale.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: 'en', targetLocale: 'de' }) });

      component.openTranslateLocaleDialog();

      expect(error).toHaveBeenCalledWith('Locale Translate failed.');
    });
  });
});

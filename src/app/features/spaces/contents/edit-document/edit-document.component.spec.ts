import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ContentDocument, ContentKind } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { Schema, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { Token, TokenPermission } from '@shared/models/token.model';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { TokenService } from '@shared/services/token.service';
import { TranslateService } from '@shared/services/translate.service';
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

  function setup(document: ContentDocument, options: { schemas?: Schema[]; selectedSpace?: Space } = {}) {
    const schemas = options.schemas ?? [rootSchema, childSchema];
    const selectedSpace = options.selectedSpace ?? space();

    const publish = vi.fn().mockReturnValue(of(undefined));
    const unpublish = vi.fn().mockReturnValue(of(undefined));
    const updateDocumentData = vi.fn().mockReturnValue(of(undefined));
    const translateBatch = vi.fn().mockReturnValue(of({ items: [], failed: [] }));
    const findFirstByPermission = vi.fn().mockReturnValue(of([{ id: 'token1' } as Token]));
    const isActionSave = vi.fn().mockReturnValue(false);
    const navigate = vi.fn();
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(EditDocumentComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: ContentService, useValue: { publish, unpublish, updateDocumentData } },
        { provide: TranslateService, useValue: { translateBatch } },
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
      translateBatch,
      findFirstByPermission,
      isActionSave,
      navigate,
      success,
      error,
      open,
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

    it('navigateToSchemaForwards() aborts and leaves state unchanged when the array target is not found', () => {
      const data = { _id: 'root-id', schema: 'root1', children: [{ _id: 'child-id', schema: 'child1' }] };
      const { component } = setup(documentOf(data));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      component.navigateToSchemaForwards({ contentId: 'missing-id', schemaName: 'child1', fieldName: 'children' });

      expect(component.selectedDocumentData).toEqual(data);
      expect(component.schemaPath()).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('navigateToSchemaBackwards() falls back to root and warns when an intermediate array node is not found', () => {
      const data = { _id: 'root-id', schema: 'root1', children: [{ _id: 'child-id', schema: 'child1' }] };
      const { component } = setup(documentOf(data));
      component.navigateToSchemaForwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'children' });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Remove the item from documentData so the backwards traversal can no longer find 'child-id'
      component.documentData['children'] = [];

      component.navigateToSchemaBackwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'children' });

      expect(component.selectedDocumentData).toEqual(component.documentData);
      expect(component.schemaPath()).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('navigateToSchemaBackwards() to a middle breadcrumb selects that level, not the current deepest level', () => {
      const data = {
        _id: 'root-id',
        schema: 'root1',
        child: {
          _id: 'child-id',
          schema: 'child1',
          grandchild: { _id: 'grandchild-id', schema: 'grandchild1' },
        },
      };
      const { component } = setup(documentOf(data));
      component.navigateToSchemaForwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });
      component.navigateToSchemaForwards({ contentId: 'grandchild-id', schemaName: 'grandchild1', fieldName: 'grandchild' });
      expect(component.selectedDocumentData).toEqual(data.child.grandchild);

      component.navigateToSchemaBackwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });

      expect(component.selectedDocumentData).toEqual(data.child);
      expect(component.schemaPath().map(it => it.contentId)).toEqual(['root-id', 'child-id']);
    });

    it('navigateToSchemaForwards() selects the matching item out of an array field', () => {
      const data = {
        _id: 'root-id',
        schema: 'root1',
        children: [
          { _id: 'child-a', schema: 'child1' },
          { _id: 'child-b', schema: 'child1' },
        ],
      };
      const { component } = setup(documentOf(data));

      component.navigateToSchemaForwards({ contentId: 'child-b', schemaName: 'child1', fieldName: 'children' });

      expect(component.selectedDocumentData).toEqual(data.children[1]);
      expect(component.schemaPath().map(it => it.contentId)).toEqual(['root-id', 'child-b']);
    });

    it('navigateToSchemaBackwards() to a middle breadcrumb through a mix of single and array fields selects that level', () => {
      const data = {
        _id: 'root-id',
        schema: 'root1',
        child: {
          _id: 'child-id',
          schema: 'child1',
          grandchildren: [
            { _id: 'grandchild-a', schema: 'grandchild1' },
            { _id: 'grandchild-b', schema: 'grandchild1' },
          ],
        },
      };
      const { component } = setup(documentOf(data));
      component.navigateToSchemaForwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });
      component.navigateToSchemaForwards({ contentId: 'grandchild-b', schemaName: 'grandchild1', fieldName: 'grandchildren' });
      expect(component.selectedDocumentData).toEqual(data.child.grandchildren[1]);

      component.navigateToSchemaBackwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });

      expect(component.selectedDocumentData).toEqual(data.child);
      expect(component.schemaPath().map(it => it.contentId)).toEqual(['root-id', 'child-id']);
    });

    it('navigateToSchemaBackwards() to the root from a 3-level-deep path truncates the whole path', () => {
      const data = {
        _id: 'root-id',
        schema: 'root1',
        child: {
          _id: 'child-id',
          schema: 'child1',
          grandchild: { _id: 'grandchild-id', schema: 'grandchild1' },
        },
      };
      const { component } = setup(documentOf(data));
      component.navigateToSchemaForwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });
      component.navigateToSchemaForwards({ contentId: 'grandchild-id', schemaName: 'grandchild1', fieldName: 'grandchild' });

      component.navigateToSchemaBackwards({ contentId: 'root-id', schemaName: 'root1', fieldName: '' });

      expect(component.selectedDocumentData).toEqual(data);
      expect(component.schemaPath()).toHaveLength(1);
    });

    it('navigateToSchemaBackwards() clicking the current deepest breadcrumb is a no-op', () => {
      const data = { _id: 'root-id', schema: 'root1', child: { _id: 'child-id', schema: 'child1' } };
      const { component } = setup(documentOf(data));
      component.navigateToSchemaForwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });

      component.navigateToSchemaBackwards({ contentId: 'child-id', schemaName: 'child1', fieldName: 'child' });

      expect(component.selectedDocumentData).toEqual(data.child);
      expect(component.schemaPath().map(it => it.contentId)).toEqual(['root-id', 'child-id']);
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

  describe('preview schema hover/leave', () => {
    it('onPreviewSchemaHover() tracks the hover path and field', () => {
      const data = { _id: 'root-id', schema: 'root1', child: { _id: 'child-id', schema: 'child1' } };
      const { component } = setup(documentOf(data));

      component.onPreviewSchemaHover({ id: 'child-id', field: 'title' });

      expect(component.hoverSchemaPath()).toEqual(['root-id', 'child-id']);
      expect(component.hoverSchemaField()).toBe('title');
    });

    it('onPreviewSchemaLeave() clears the hover path and field', () => {
      const data = { _id: 'root-id', schema: 'root1', child: { _id: 'child-id', schema: 'child1' } };
      const { component } = setup(documentOf(data));
      component.onPreviewSchemaHover({ id: 'child-id', field: 'title' });

      component.onPreviewSchemaLeave();

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

  /**
   * Whole-document translation runs against the in-memory document, so these assert the round
   * trip: collect from `documentData`, send one batch, write the results back. Nothing here
   * touches Firestore - that only happens when the author presses Save.
   */
  describe('openTranslateLocaleDialog', () => {
    const translatableSchema = {
      id: 'root1',
      type: SchemaType.ROOT,
      fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true } as never],
    } as unknown as Schema;

    function translatableSetup() {
      return setup(documentOf({ _id: 'd1', schema: 'root1', title: 'Hello' }), { schemas: [translatableSchema] });
    }

    it('sends the collected fields as one batch and applies the results to the document', () => {
      const { component, open, translateBatch, success } = translatableSetup();
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: CONTENT_DEFAULT_LOCALE.id, targetLocale: 'de', overwrite: false }) });
      translateBatch.mockImplementation((data: { items: { id: string }[] }) =>
        of({ items: data.items.map(it => ({ id: it.id, content: 'Hallo' })), failed: [] }),
      );

      component.openTranslateLocaleDialog();

      expect(translateBatch).toHaveBeenCalledTimes(1);
      expect(translateBatch.mock.calls[0][0]).toMatchObject({
        // `default` is the space's fallback locale, so the provider is told the real language
        // rather than being left to auto-detect it.
        sourceLocale: 'en',
        targetLocale: 'de',
        items: [{ content: 'Hello', format: 'text' }],
      });
      expect(component.documentData['title_i18n_de']).toBe('Hallo');
      expect(success).toHaveBeenCalledWith('Translated 1 fields. Review them and press Save.');
    });

    // Translating *into* the default locale asks the provider for the fallback language, and the
    // result belongs under the bare field name. Sending `default` would be rejected as a language.
    it('resolves the default locale to the fallback language in both directions', () => {
      const { component, open, translateBatch } = setup(documentOf({ _id: 'd1', schema: 'root1', title_i18n_de: 'Hallo' }), {
        schemas: [translatableSchema],
      });
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: 'de', targetLocale: CONTENT_DEFAULT_LOCALE.id, overwrite: false }) });
      translateBatch.mockImplementation((data: { items: { id: string }[] }) =>
        of({ items: data.items.map(it => ({ id: it.id, content: 'Hello' })), failed: [] }),
      );

      component.openTranslateLocaleDialog();

      expect(translateBatch.mock.calls[0][0]).toMatchObject({ sourceLocale: 'de', targetLocale: 'en' });
      expect(component.documentData['title']).toBe('Hello');
      expect(component.documentData['title_i18n_default']).toBeUndefined();
    });

    it('rebuilds the form so the applied values are visible', () => {
      const { component, open, translateBatch } = translatableSetup();
      const before = component.formRefresh();
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: CONTENT_DEFAULT_LOCALE.id, targetLocale: 'de', overwrite: false }) });
      translateBatch.mockImplementation((data: { items: { id: string }[] }) =>
        of({ items: data.items.map(it => ({ id: it.id, content: 'Hallo' })), failed: [] }),
      );

      component.openTranslateLocaleDialog();

      expect(component.formRefresh()).toBe(before + 1);
    });

    it('passes the overwrite choice through to collection', () => {
      const { component, open, translateBatch } = setup(
        documentOf({ _id: 'd1', schema: 'root1', title: 'Hello', title_i18n_de: 'Hallo' }),
        { schemas: [translatableSchema] },
      );
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: CONTENT_DEFAULT_LOCALE.id, targetLocale: 'de', overwrite: true }) });
      translateBatch.mockImplementation((data: { items: { id: string }[] }) =>
        of({ items: data.items.map(it => ({ id: it.id, content: 'Neu' })), failed: [] }),
      );

      component.openTranslateLocaleDialog();

      expect(component.documentData['title_i18n_de']).toBe('Neu');
    });

    it('does not call the provider when every target is already translated', () => {
      const { component, open, translateBatch, success } = setup(
        documentOf({ _id: 'd1', schema: 'root1', title: 'Hello', title_i18n_de: 'Hallo' }),
        { schemas: [translatableSchema] },
      );
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: CONTENT_DEFAULT_LOCALE.id, targetLocale: 'de', overwrite: false }) });

      component.openTranslateLocaleDialog();

      expect(translateBatch).not.toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith('Nothing to translate: every field already has a translation.');
    });

    it('reports partial failures rather than swallowing them', () => {
      const { component, open, translateBatch, error } = translatableSetup();
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: CONTENT_DEFAULT_LOCALE.id, targetLocale: 'de', overwrite: false }) });
      translateBatch.mockReturnValue(of({ items: [], failed: [{ id: 'd1.title', reason: 'too large' }] }));

      component.openTranslateLocaleDialog();

      expect(error).toHaveBeenCalledWith('Translated 0 of 1 fields. 1 could not be translated.');
    });

    it('notifies an error on failure, leaving the document untouched', () => {
      const { component, open, translateBatch, error } = translatableSetup();
      translateBatch.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of({ sourceLocale: CONTENT_DEFAULT_LOCALE.id, targetLocale: 'de', overwrite: false }) });

      component.openTranslateLocaleDialog();

      expect(error).toHaveBeenCalledWith('Locale Translate failed.');
      expect(component.documentData['title_i18n_de']).toBeUndefined();
    });
  });
});

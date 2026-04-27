import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ContentDocument, ContentKind, LinkContent } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldLink } from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { LinkSelectComponent } from './link-select.component';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeDoc(id: string, name = `Doc ${id}`, fullSlug = `/doc-${id}`): ContentDocument {
  return {
    id,
    name,
    fullSlug,
    kind: ContentKind.DOCUMENT,
    slug: `doc-${id}`,
    parentSlug: '',
    schema: 'test',
  } as ContentDocument;
}

function makeForm(type = 'url', uri: string | null = null, target = '_self'): FormGroup {
  return new FormGroup({
    kind: new FormControl('LINK'),
    type: new FormControl(type),
    uri: new FormControl(uri),
    target: new FormControl(target),
  });
}

const baseComponent: SchemaFieldLink = {
  name: 'link',
  kind: SchemaFieldKind.LINK,
};

const mockSettingsStore = {
  debugEnabled: signal(false),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('LinkSelectComponent', () => {
  let component: LinkSelectComponent;
  let fixture: ComponentFixture<LinkSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkSelectComponent, ReactiveFormsModule],
      providers: [{ provide: LocalSettingsStore, useValue: mockSettingsStore }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkSelectComponent);
    component = fixture.componentInstance;
  });

  function setInputs(opts: { form: FormGroup; documents?: ContentDocument[]; default?: LinkContent }): void {
    fixture.componentRef.setInput('form', opts.form);
    fixture.componentRef.setInput('component', baseComponent);
    fixture.componentRef.setInput('documents', opts.documents ?? []);
    if (opts.default !== undefined) {
      fixture.componentRef.setInput('default', opts.default);
    }
  }

  // ── Regression: content type initialization ──────────────────────────────

  describe('initialization with type=content (regression)', () => {
    it('should resolve selectedDocument when documents are already loaded on init', () => {
      const doc = makeDoc('0sCj8QfrcCltrB9OOkM6', 'About', '/about');
      const form = makeForm('content', '0sCj8QfrcCltrB9OOkM6');

      setInputs({ form, documents: [doc] });
      fixture.detectChanges();

      expect(component.selectedDocument()).toBe(doc);
    });

    it('should NOT clear the form uri while documents are still loading', () => {
      const form = makeForm('content', '0sCj8QfrcCltrB9OOkM6');

      // Documents not yet available
      setInputs({ form, documents: [] });
      fixture.detectChanges();

      expect(form.get('uri')!.value).toBe('0sCj8QfrcCltrB9OOkM6');
    });

    it('should resolve selectedDocument once documents arrive asynchronously', () => {
      const doc = makeDoc('0sCj8QfrcCltrB9OOkM6', 'About', '/about');
      const form = makeForm('content', '0sCj8QfrcCltrB9OOkM6');

      // Initialize with empty documents list
      setInputs({ form, documents: [] });
      fixture.detectChanges();

      expect(component.selectedDocument()).toBeNull();
      expect(form.get('uri')!.value).toBe('0sCj8QfrcCltrB9OOkM6');

      // Documents arrive
      fixture.componentRef.setInput('documents', [doc]);
      fixture.detectChanges();

      expect(component.selectedDocument()).toBe(doc);
      expect(form.get('uri')!.value).toBe('0sCj8QfrcCltrB9OOkM6');
    });

    it('should set selectedDocument to null when uri does not match any document', () => {
      const form = makeForm('content', 'unknown-id');

      setInputs({ form, documents: [makeDoc('other-id')] });
      fixture.detectChanges();

      expect(component.selectedDocument()).toBeNull();
    });

    it('should set selectedDocument to null when uri is null', () => {
      const form = makeForm('content', null);
      const doc = makeDoc('doc1');

      setInputs({ form, documents: [doc] });
      fixture.detectChanges();

      expect(component.selectedDocument()).toBeNull();
    });
  });

  // ── url type: must not affect selectedDocument ────────────────────────────

  describe('initialization with type=url', () => {
    it('should leave selectedDocument as null', () => {
      const form = makeForm('url', 'https://example.com');

      setInputs({ form, documents: [makeDoc('abc')] });
      fixture.detectChanges();

      expect(component.selectedDocument()).toBeNull();
    });

    it('should preserve the form uri value', () => {
      const form = makeForm('url', 'https://example.com');

      setInputs({ form, documents: [] });
      fixture.detectChanges();

      expect(form.get('uri')!.value).toBe('https://example.com');
    });
  });

  // ── onDocumentSelect ──────────────────────────────────────────────────────

  describe('onDocumentSelect', () => {
    it('should update selectedDocument and form uri when a document is chosen', () => {
      const doc = makeDoc('doc1', 'Home', '/home');
      const form = makeForm('content', null);

      setInputs({ form, documents: [doc] });
      fixture.detectChanges();

      component.onDocumentSelect(doc);

      expect(component.selectedDocument()).toBe(doc);
      expect(form.get('uri')!.value).toBe('doc1');
    });

    it('should clear selectedDocument and set form uri to null when null is passed', () => {
      const doc = makeDoc('doc1');
      const form = makeForm('content', 'doc1');

      setInputs({ form, documents: [doc] });
      fixture.detectChanges();

      component.onDocumentSelect(null);

      expect(component.selectedDocument()).toBeNull();
      expect(form.get('uri')!.value).toBeNull();
    });

    it('should replace the previously selected document', () => {
      const doc1 = makeDoc('doc1', 'Home', '/home');
      const doc2 = makeDoc('doc2', 'About', '/about');
      const form = makeForm('content', 'doc1');

      setInputs({ form, documents: [doc1, doc2] });
      fixture.detectChanges();

      component.onDocumentSelect(doc2);

      expect(component.selectedDocument()).toBe(doc2);
      expect(form.get('uri')!.value).toBe('doc2');
    });
  });

  // ── onTypeChange ──────────────────────────────────────────────────────────

  describe('onTypeChange', () => {
    it('should clear form uri and selectedDocument when switching to url', () => {
      const doc = makeDoc('doc1');
      const form = makeForm('content', 'doc1');

      setInputs({ form, documents: [doc] });
      fixture.detectChanges();

      component.onTypeChange('url');
      fixture.detectChanges();

      expect(form.get('type')!.value).toBe('url');
      expect(form.get('uri')!.value).toBeNull();
      expect(component.selectedDocument()).toBeNull();
    });

    it('should clear form uri and selectedDocument when switching to content', () => {
      const form = makeForm('url', 'https://example.com');

      setInputs({ form, documents: [] });
      fixture.detectChanges();

      component.onTypeChange('content');
      fixture.detectChanges();

      expect(form.get('type')!.value).toBe('content');
      expect(form.get('uri')!.value).toBeNull();
      expect(component.selectedDocument()).toBeNull();
    });
  });

  // ── targetChange ──────────────────────────────────────────────────────────

  describe('targetChange', () => {
    it('should set target to _blank when checked is true', () => {
      const form = makeForm('url', null, '_self');

      setInputs({ form });
      fixture.detectChanges();

      component.targetChange(true);

      expect(form.get('target')!.value).toBe('_blank');
    });

    it('should set target to _self when checked is false', () => {
      const form = makeForm('url', null, '_blank');

      setInputs({ form });
      fixture.detectChanges();

      component.targetChange(false);

      expect(form.get('target')!.value).toBe('_self');
    });
  });

  // ── filteredOptions ───────────────────────────────────────────────────────

  describe('filteredOptions', () => {
    it('should return all documents when search is empty', () => {
      const docs = [makeDoc('1', 'Home', '/home'), makeDoc('2', 'About', '/about')];

      setInputs({ form: makeForm(), documents: docs });
      fixture.detectChanges();

      expect(component.filteredOptions()).toEqual(docs);
    });

    it('should filter documents by name (case-insensitive)', () => {
      const home = makeDoc('1', 'Home', '/home');
      const about = makeDoc('2', 'About', '/about');

      setInputs({ form: makeForm(), documents: [home, about] });
      fixture.detectChanges();

      component.search.set('HOME');

      expect(component.filteredOptions()).toEqual([home]);
    });

    it('should filter documents by fullSlug (case-insensitive)', () => {
      const home = makeDoc('1', 'Home', '/home');
      const about = makeDoc('2', 'About', '/about');

      setInputs({ form: makeForm(), documents: [home, about] });
      fixture.detectChanges();

      component.search.set('/ABOUT');

      expect(component.filteredOptions()).toEqual([about]);
    });

    it('should return empty array when no document matches the search', () => {
      setInputs({ form: makeForm(), documents: [makeDoc('1', 'Home', '/home')] });
      fixture.detectChanges();

      component.search.set('xyz-no-match');

      expect(component.filteredOptions()).toEqual([]);
    });
  });

  // ── defaultDocument ───────────────────────────────────────────────────────

  describe('defaultDocument', () => {
    it('should return undefined when no default input is provided', () => {
      setInputs({ form: makeForm(), documents: [makeDoc('abc')] });
      fixture.detectChanges();

      expect(component.defaultDocument()).toBeUndefined();
    });

    it('should return the document matching the default uri', () => {
      const doc = makeDoc('abc');
      const defaultLink: LinkContent = { kind: 'LINK', type: 'content', target: '_self', uri: 'abc' };

      setInputs({ form: makeForm(), documents: [doc], default: defaultLink });
      fixture.detectChanges();

      expect(component.defaultDocument()).toBe(doc);
    });

    it('should return undefined when default uri does not match any document', () => {
      const defaultLink: LinkContent = { kind: 'LINK', type: 'content', target: '_self', uri: 'missing' };

      setInputs({ form: makeForm(), documents: [makeDoc('other')], default: defaultLink });
      fixture.detectChanges();

      expect(component.defaultDocument()).toBeUndefined();
    });
  });

  // ── itemToString / displayContent ─────────────────────────────────────────

  describe('itemToString', () => {
    it('should format document as "name | fullSlug"', () => {
      const doc = makeDoc('1', 'Home', '/home');

      expect(component.itemToString(doc)).toBe('Home | /home');
    });
  });

  describe('displayContent', () => {
    it('should format document as "name | fullSlug"', () => {
      const doc = makeDoc('1', 'Home', '/home');

      expect(component.displayContent(doc)).toBe('Home | /home');
    });

    it('should return empty string for undefined', () => {
      expect(component.displayContent(undefined)).toBe('');
    });
  });

  // ── linkType signal ───────────────────────────────────────────────────────

  describe('linkType', () => {
    it('should reflect the initial form type', () => {
      setInputs({ form: makeForm('content'), documents: [] });
      fixture.detectChanges();

      expect(component.linkType()).toBe('content');
    });

    it('should update reactively when form type is patched', () => {
      const form = makeForm('url');

      setInputs({ form, documents: [] });
      fixture.detectChanges();

      expect(component.linkType()).toBe('url');

      form.patchValue({ type: 'content' });
      fixture.detectChanges();

      expect(component.linkType()).toBe('content');
    });
  });
});

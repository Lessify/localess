import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { FormBuilder } from '@angular/forms';
import { ContentDocument, ContentKind, SchemaFieldKind, SchemaFieldReference, Space } from '@localess/shared';
import { SpaceStore } from '@core/stores/space.store';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ReferenceSelectComponent } from './reference-select.component';

function doc(id: string, name: string): ContentDocument {
  return { id, kind: ContentKind.DOCUMENT, name, slug: id } as unknown as ContentDocument;
}

describe('ReferenceSelectComponent', () => {
  function setup(uri: string | null, kind: SchemaFieldKind.REFERENCE | null = SchemaFieldKind.REFERENCE) {
    // What SpaceStore holds.
    const contentById = signal(new Map([doc('c1', 'Page'), doc('c2', 'New')].map(it => [it.id, it])));
    const open = vi.fn();

    TestBed.overrideComponent(ReferenceSelectComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: HlmDialogService, useValue: { open } },
        { provide: SpaceStore, useValue: { contentById } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const form = fb.group({ uri: fb.control(uri), kind: fb.control(kind) });
    const fixture = TestBed.createComponent(ReferenceSelectComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('component', {} as unknown as SchemaFieldReference);
    fixture.componentRef.setInput('space', { id: 'space-1' } as Space);
    fixture.detectChanges();
    return { component: fixture.componentInstance, contentById, open, form };
  }

  it('defaults the kind to REFERENCE when unset', () => {
    const { form } = setup(null, null);

    expect(form.value.kind).toBe(SchemaFieldKind.REFERENCE);
  });

  it('shows the referenced document from SpaceStore when a uri is already set', () => {
    const { component } = setup('c1');

    expect(component.content()?.name).toBe('Page');
  });

  it('shows nothing without a uri, or for a document gone from the space', () => {
    expect(setup(null).component.content()).toBeUndefined();
    TestBed.resetTestingModule();
    expect(setup('gone').component.content()).toBeUndefined();
  });

  it('openReferenceSelectDialog() sets the content and form fields from the dialog result', () => {
    const { component, open, form } = setup(null);
    const selected = doc('c2', 'New');
    open.mockReturnValue({ closed$: of([selected]) });

    component.openReferenceSelectDialog();

    expect(component.content()?.id).toBe(selected.id);
    expect(form.value).toEqual({ uri: 'c2', kind: SchemaFieldKind.REFERENCE });
  });

  it('openReferenceSelectDialog() does nothing when the dialog is dismissed', () => {
    const { component, open } = setup(null);
    open.mockReturnValue({ closed$: of(undefined) });

    component.openReferenceSelectDialog();

    expect(component.content()).toBeUndefined();
  });

  it('deleteReference() clears the content and the form uri', () => {
    const { component, form } = setup('c1');

    component.deleteReference();

    expect(component.content()).toBeUndefined();
    expect(form.value.uri).toBeNull();
  });
});

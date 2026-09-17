import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { FormBuilder } from '@angular/forms';
import { ContentDocument, ContentKind } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldReference } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { ContentService } from '@shared/services/content.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ReferenceSelectComponent } from './reference-select.component';

function doc(id: string, name: string): ContentDocument {
  return { id, kind: ContentKind.DOCUMENT, name, slug: id } as unknown as ContentDocument;
}

describe('ReferenceSelectComponent', () => {
  function setup(uri: string | null, kind: SchemaFieldKind.REFERENCE | null = SchemaFieldKind.REFERENCE) {
    const findById = vi.fn().mockReturnValue(of(doc('c1', 'Page')));
    const open = vi.fn();

    TestBed.overrideComponent(ReferenceSelectComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: HlmDialogService, useValue: { open } },
        { provide: ContentService, useValue: { findById } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const form = fb.group({ uri: fb.control(uri), kind: fb.control(kind) });
    const fixture = TestBed.createComponent(ReferenceSelectComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('component', {} as unknown as SchemaFieldReference);
    fixture.componentRef.setInput('space', { id: 'space-1' } as Space);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findById, open, form };
  }

  it('defaults the kind to REFERENCE when unset', () => {
    const { form } = setup(null, null);

    expect(form.value.kind).toBe(SchemaFieldKind.REFERENCE);
  });

  it('loads the referenced content when a uri is already set', () => {
    const { component, findById } = setup('c1');

    expect(findById).toHaveBeenCalledWith('space-1', 'c1');
    expect(component.content()?.id).toBe('c1');
  });

  it('does not load content when there is no uri', () => {
    const { findById } = setup(null);

    expect(findById).not.toHaveBeenCalled();
  });

  it('openReferenceSelectDialog() sets the content and form fields from the dialog result', () => {
    const { component, open, form } = setup(null);
    const selected = doc('c2', 'New');
    open.mockReturnValue({ closed$: of([selected]) });

    component.openReferenceSelectDialog();

    expect(component.content()).toEqual(selected);
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

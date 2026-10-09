import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { FormBuilder } from '@angular/forms';
import { ContentDocument, ContentKind } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldReferences } from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { ContentService } from '@shared/services/content.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ReferencesSelectComponent } from './references-select.component';

function doc(id: string, name: string): ContentDocument {
  return { id, kind: ContentKind.DOCUMENT, name, slug: id } as unknown as ContentDocument;
}

describe('ReferencesSelectComponent', () => {
  function setup(uris: string[] = [], results: ContentDocument[] = []) {
    const findByIds = vi.fn().mockReturnValue(of(results));
    const open = vi.fn();

    TestBed.overrideComponent(ReferencesSelectComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: HlmDialogService, useValue: { open } },
        { provide: ContentService, useValue: { findByIds } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const form = fb.array(uris.map(uri => fb.group({ uri: fb.control(uri), kind: fb.control(SchemaFieldKind.REFERENCE) })));
    const fixture = TestBed.createComponent(ReferencesSelectComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('component', {} as unknown as SchemaFieldReferences);
    fixture.componentRef.setInput('space', { id: 'space-1' } as Space);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findByIds, open, form };
  }

  it('does not load anything when there are no uris', () => {
    const { findByIds } = setup([]);

    expect(findByIds).not.toHaveBeenCalled();
  });

  it('loads documents preserving the original uri order', () => {
    const c1 = doc('c1', 'First');
    const c2 = doc('c2', 'Second');
    const { component, findByIds } = setup(['c2', 'c1'], [c1, c2]);

    expect(findByIds).toHaveBeenCalledWith('space-1', ['c2', 'c1']);
    expect(component.contents()).toEqual([c2, c1]);
  });

  it('ignores non-document content in the resolved results', () => {
    const folder = { id: 'f1', kind: ContentKind.FOLDER, name: 'Folder' } as unknown as ContentDocument;
    const { component } = setup(['f1'], [folder]);

    expect(component.contents()).toEqual([]);
  });

  it('openReferenceSelectDialog() appends selected documents and rebuilds the form', () => {
    const { component, open, form } = setup([]);
    const selected = [doc('c1', 'New')];
    open.mockReturnValue({ closed$: of(selected) });

    component.openReferenceSelectDialog();

    expect(component.contents()).toEqual(selected);
    expect(form.length).toBe(1);
    expect(form.at(0).value).toEqual({ uri: 'c1', kind: SchemaFieldKind.REFERENCE });
  });

  it('deleteReference() removes the document at the given index', () => {
    const emitted: string[][] = [];
    const { component, form } = setup(['c1', 'c2'], [doc('c1', 'A'), doc('c2', 'B')]);
    component.referencesChange.subscribe(v => emitted.push(v));

    component.deleteReference(0);

    expect(component.contents().map(c => c.id)).toEqual(['c2']);
    expect(form.length).toBe(1);
    expect(emitted).toEqual([['c2']]);
  });

  it('referenceDropDrop() reorders both the form array and the contents signal', () => {
    const { component, form } = setup(['c1', 'c2'], [doc('c1', 'A'), doc('c2', 'B')]);

    component.referenceDropDrop({ previousIndex: 0, currentIndex: 1 } as never);

    expect(component.contents().map(c => c.id)).toEqual(['c2', 'c1']);
    expect(form.at(0).value.uri).toBe('c2');
    expect(form.at(1).value.uri).toBe('c1');
  });

  it('referenceDropDrop() no-ops when the index is unchanged', () => {
    const { component } = setup(['c1'], [doc('c1', 'A')]);

    component.referenceDropDrop({ previousIndex: 0, currentIndex: 0 } as never);

    expect(component.contents().map(c => c.id)).toEqual(['c1']);
  });
});

import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Schema } from '@shared/models/schema.model';

import { AddDocumentDialogContext } from './add-document-dialog.model';
import { AddDocumentDialogComponent } from './add-document-dialog.component';

describe('AddDocumentDialogComponent', () => {
  const schemas: Schema[] = [{ id: 's1', displayName: 'Page' } as Schema];

  function setup(context: AddDocumentDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(AddDocumentDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(AddDocumentDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close, fixture };
  }

  it('starts with empty, invalid controls', () => {
    const { component } = setup({ schemas, reservedNames: [], reservedSlugs: [] });

    expect(component.form.value).toEqual({ name: '', slug: '', schema: null });
    expect(component.form.invalid).toBe(true);
  });

  it('auto-generates the slug from the name while untouched', () => {
    const { component, fixture } = setup({ schemas, reservedNames: [], reservedSlugs: [] });

    component.form.controls['name'].setValue('My Page');
    fixture.detectChanges();

    expect(component.form.value.slug).toBe('my-page');
  });

  it('stops auto-generating the slug once touched', () => {
    const { component, fixture } = setup({ schemas, reservedNames: [], reservedSlugs: [] });

    component.form.controls['slug'].markAsTouched();
    component.form.controls['name'].setValue('My Page');
    fixture.detectChanges();

    expect(component.form.value.slug).toBe('');
  });

  it('rejects a reserved name/slug', () => {
    const { component } = setup({ schemas, reservedNames: ['Existing'], reservedSlugs: ['existing'] });

    component.form.controls['name'].setValue('Existing');
    component.form.controls['slug'].setValue('existing');

    expect(component.form.controls['name'].errors).toEqual({ reservedName: true });
    expect(component.form.controls['slug'].errors).toEqual({ reservedName: true });
  });

  it('schemaItemToString() shows the schema display name, or falls back to the raw value', () => {
    const { component } = setup({ schemas, reservedNames: [], reservedSlugs: [] });

    expect(component['schemaItemToString']('s1')).toBe('Page');
    expect(component['schemaItemToString']('unknown')).toBe('unknown');
  });

  it('normalizeSlug() reformats the current slug value', () => {
    const { component } = setup({ schemas, reservedNames: [], reservedSlugs: [] });
    component.form.controls['slug'].setValue('My Page');

    component.normalizeSlug();

    expect(component.form.value.slug).toBe('my-page');
  });
});

import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';
import { SchemaType } from '@shared/models/schema.model';

import { AddDialogContext } from './add-dialog.model';
import { AddDialogComponent } from './add-dialog.component';

describe('AddDialogComponent', () => {
  function setup(context: AddDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(AddDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(AddDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, close };
  }

  it('starts with a NODE type and an empty id', () => {
    const { component } = setup({ reservedIds: [] });

    expect(component.form.value.type).toBe(SchemaType.NODE);
    expect(component.form.value.id).toBe('');
    expect(component.type).toBe(SchemaType.NODE);
  });

  it('lists every schema type', () => {
    const { component } = setup({ reservedIds: [] });

    expect(component.types).toEqual(Object.keys(SchemaType));
  });

  it('auto-generates the id from the display name while untouched', () => {
    const { component, fixture } = setup({ reservedIds: [] });

    component.form.controls['displayName'].setValue('my schema name');
    fixture.detectChanges();

    expect(component.form.value.id).toBe('MySchemaName');
  });

  it('stops auto-generating the id once the id field is touched', () => {
    const { component, fixture } = setup({ reservedIds: [] });

    component.form.controls['id'].markAsTouched();
    component.form.controls['displayName'].setValue('my schema name');
    fixture.detectChanges();

    expect(component.form.value.id).toBe('');
  });

  it('rejects an id that collides with a reserved id', () => {
    const { component } = setup({ reservedIds: ['Existing'] });

    component.form.controls['id'].setValue('Existing');

    expect(component.form.controls['id'].errors).toEqual({ reservedName: true });
  });

  it('normalizeId() reformats the current id value', () => {
    const { component } = setup({ reservedIds: [] });
    component.form.controls['id'].setValue('my schema');

    component.normalizeId();

    expect(component.form.value.id).toBe('MySchema');
  });

  it('normalizeId() does nothing when the id is empty', () => {
    const { component } = setup({ reservedIds: [] });

    component.normalizeId();

    expect(component.form.value.id).toBe('');
  });

  it('typeItemToString() shows the friendly type name, or falls back to the raw value', () => {
    const { component } = setup({ reservedIds: [] });

    expect(component['typeItemToString'](SchemaType.ROOT)).toBe('Root');
    expect(component['typeItemToString']('unknown')).toBe('unknown');
  });
  it('closes with the form value when saved', () => {
    const { component, close } = setup({ reservedIds: [] });
    component.form.patchValue({ displayName: 'My Schema', id: 'my-schema' });

    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'My Schema', id: 'my-schema' }));
  });
});

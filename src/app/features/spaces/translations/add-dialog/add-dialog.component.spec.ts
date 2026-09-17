import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';

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
    return { component: fixture.componentInstance, close };
  }

  it('starts with STRING type and no auto-translate', () => {
    const { component } = setup({ reservedIds: [] });

    expect(component.form.value.type).toBe('STRING');
    expect(component.form.value.autoTranslate).toBe(false);
  });

  it('rejects an id that collides with a reserved id', () => {
    const { component } = setup({ reservedIds: ['existing.id'] });

    component.form.controls['id'].setValue('existing.id');

    expect(component.form.controls['id'].errors).toEqual({ reservedName: true });
  });

  it('addLabel() trims and appends to an empty labels list', () => {
    const { component } = setup({ reservedIds: [] });

    component.addLabel('  ui  ');

    expect(component.form.value.labels).toEqual(['ui']);
  });

  it('addLabel() appends to an existing labels list', () => {
    const { component } = setup({ reservedIds: [] });
    component.addLabel('ui');

    component.addLabel('marketing');

    expect(component.form.value.labels).toEqual(['ui', 'marketing']);
  });

  it('addLabel() ignores a blank value', () => {
    const { component } = setup({ reservedIds: [] });

    component.addLabel('   ');

    expect(component.form.value.labels).toEqual([]);
  });

  it('removeLabel() removes the given label', () => {
    const { component } = setup({ reservedIds: [] });
    component.addLabel('ui');
    component.addLabel('marketing');

    component.removeLabel('ui');

    expect(component.form.value.labels).toEqual(['marketing']);
  });
it('closes with the form value when saved', () => {
    const { component, close } = setup({ reservedIds: [] });
    component.form.patchValue({ id: 'greeting', value: 'Hello' });

    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ id: 'greeting', value: 'Hello' }));
  });
});

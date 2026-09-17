import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { EditIdDialogContext } from './edit-id-dialog.model';
import { EditIdDialogComponent } from './edit-id-dialog.component';

describe('EditIdDialogComponent', () => {
  function setup(context: EditIdDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(EditIdDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(EditIdDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('patches the form with the current id', () => {
    const { component } = setup({ id: 'MySchema', reservedIds: ['Other'] });

    expect(component.form.value).toEqual({ id: 'MySchema' });
    expect(component.form.valid).toBe(true);
  });

  it('rejects an id that collides with a reserved id', () => {
    const { component } = setup({ id: 'MySchema', reservedIds: ['Other'] });

    component.form.controls['id'].setValue('Other');

    expect(component.form.controls['id'].errors).toEqual({ reservedName: true });
  });
  it('closes with the bare id, not the form object', () => {
    const { component, close } = setup({ id: 'MySchema', reservedIds: ['Other'] });
    component.form.patchValue({ id: 'Renamed' });

    component.save();

    expect(close).toHaveBeenCalledWith('Renamed');
  });
});

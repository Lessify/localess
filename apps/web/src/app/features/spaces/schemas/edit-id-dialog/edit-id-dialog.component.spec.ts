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

  it('patches the form with the current name', () => {
    const { component } = setup({ name: 'MySchema', reservedNames: ['Other'] });

    expect(component.form.value).toEqual({ name: 'MySchema' });
    expect(component.form.valid).toBe(true);
  });

  it('rejects a name that collides with a reserved name', () => {
    const { component } = setup({ name: 'MySchema', reservedNames: ['Other'] });

    component.form.controls['name'].setValue('Other');

    expect(component.form.controls['name'].errors).toEqual({ reservedName: true });
  });
  it('closes with the bare name, not the form object', () => {
    const { component, close } = setup({ name: 'MySchema', reservedNames: ['Other'] });
    component.form.patchValue({ name: 'Renamed' });

    component.save();

    expect(close).toHaveBeenCalledWith('Renamed');
  });
});

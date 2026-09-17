import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';

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
    const { component } = setup({ id: 'my.translation', reservedIds: ['other.id'] });

    expect(component.form.value).toEqual({ id: 'my.translation' });
    expect(component.form.valid).toBe(true);
  });

  it('rejects an id that collides with a reserved id', () => {
    const { component } = setup({ id: 'my.translation', reservedIds: ['other.id'] });

    component.form.controls['id'].setValue('other.id');

    expect(component.form.controls['id'].errors).toEqual({ reservedName: true });
  });
it('closes with the bare id, not the form object', () => {
    const { component, close } = setup({ id: 'greeting', reservedIds: ['other'] });
    component.form.patchValue({ id: 'renamed' });

    component.save();

    expect(close).toHaveBeenCalledWith('renamed');
  });
});

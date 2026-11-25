import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';

import { EditIdDialogContext } from './edit-id-dialog.model';
import { EditIdDialogComponent } from './edit-id-dialog.component';

/** The server's key check, answering from a fixed list. */
const takenKeys =
  (...keys: string[]) =>
  (key: string) =>
    of(keys.includes(key));

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
    const { component } = setup({ key: 'my.translation', isKeyTaken: takenKeys('other.id', 'my.translation') });

    expect(component.form.value).toEqual({ key: 'my.translation' });
    expect(component.form.valid).toBe(true);
  });

  it('rejects a key the server says is taken, but not its own key', async () => {
    vi.useFakeTimers();
    const { component } = setup({ key: 'my.translation', isKeyTaken: takenKeys('other.id', 'my.translation') });

    component.form.controls['key'].setValue('other.id');
    await vi.advanceTimersByTimeAsync(300);
    expect(component.form.controls['key'].errors).toEqual({ reservedName: true });

    component.form.controls['key'].setValue('my.translation');
    await vi.advanceTimersByTimeAsync(300);
    expect(component.form.controls['key'].errors).toBeNull();
    vi.useRealTimers();
  });

  it('closes with the bare id, not the form object', () => {
    const { component, close } = setup({ key: 'greeting', isKeyTaken: takenKeys('other') });
    component.form.patchValue({ key: 'renamed' });

    component.save();

    expect(close).toHaveBeenCalledWith('renamed');
  });
});

import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';

import { AddDialogContext } from './add-dialog.model';
import { AddDialogComponent } from './add-dialog.component';

/** The server's key check, answering from a fixed list. */
const takenKeys =
  (...keys: string[]) =>
  (key: string) =>
    of(keys.includes(key));

/** The label input as the template passes it: Enter calls addLabel(input). */
function labelInput(value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  return input;
}

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

  it('starts with no auto-translate, and no type: translations are plain text', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });

    expect(component.form.value).not.toHaveProperty('type');
    expect(component.form.value.autoTranslate).toBe(false);
  });

  it('rejects a key the server says is taken, after a short pause', async () => {
    vi.useFakeTimers();
    const { component } = setup({ isKeyTaken: takenKeys('existing.id') });

    component.form.controls['key'].setValue('existing.id');
    expect(component.form.controls['key'].pending).toBe(true);
    await vi.advanceTimersByTimeAsync(300);

    expect(component.form.controls['key'].errors).toEqual({ reservedName: true });
    vi.useRealTimers();
  });

  it('addLabel() trims and appends to an empty labels list', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });

    component.addLabel(labelInput('  ui  '));

    expect(component.form.value.labels).toEqual(['ui']);
  });

  it('addLabel() appends to an existing labels list', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });
    component.addLabel(labelInput('ui'));

    component.addLabel(labelInput('marketing'));

    expect(component.form.value.labels).toEqual(['ui', 'marketing']);
  });

  it('addLabel() ignores a blank value', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });

    component.addLabel(labelInput('   '));

    expect(component.form.value.labels).toEqual([]);
  });

  it('addLabel() keeps a single label valid (the form used to require two)', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });

    component.addLabel(labelInput('solo'));

    expect(component.form.value.labels).toEqual(['solo']);
    expect(component.form.controls['labels'].valid).toBe(true);
  });

  it('addLabel() refuses a duplicate, a label with spaces or one too short, and keeps the text', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });
    component.addLabel(labelInput('ui'));

    for (const [value, error] of [
      ['ui', "'ui' is already added."],
      ['has space', 'A label can not contain spaces.'],
      ['x', 'A label needs at least 2 characters.'],
    ]) {
      const input = labelInput(value);
      component.addLabel(input);
      expect(component.labelError()).toBe(error);
      expect(input.value).toBe(value);
    }
    expect(component.form.value.labels).toEqual(['ui']);
  });

  it('addLabel() clears the input and the error once a label is added', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });
    component.addLabel(labelInput('x'));
    const input = labelInput('valid');

    component.addLabel(input);

    expect(component.labelError()).toBeUndefined();
    expect(input.value).toBe('');
  });

  it('removeLabel() removes the given label', () => {
    const { component } = setup({ isKeyTaken: takenKeys() });
    component.addLabel(labelInput('ui'));
    component.addLabel(labelInput('marketing'));

    component.removeLabel('ui');

    expect(component.form.value.labels).toEqual(['marketing']);
  });
  it('closes with the form value when saved', () => {
    const { component, close } = setup({ isKeyTaken: takenKeys() });
    component.form.patchValue({ key: 'greeting', value: 'Hello' });

    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ key: 'greeting', value: 'Hello' }));
  });

  it('counts the value against the shared limit (10,000), not a hardcoded one', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { isKeyTaken: takenKeys() } },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(AddDialogComponent);
    fixture.componentInstance.form.controls['value'].setValue('Hello');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, '');
    expect(text).toContain(`5/${TRANSLATION_VALUE_MAX_LENGTH}`);
  });
});

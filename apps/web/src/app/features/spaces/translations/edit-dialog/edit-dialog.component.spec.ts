import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Translation } from '@localess/shared';

import { EditDialogComponent } from './edit-dialog.component';

function translation(overrides: Partial<Translation> = {}): Translation {
  return { id: 't1', locales: {}, ...overrides } as Translation;
}

/** The label input as the template passes it: Enter calls addLabel(input). */
function labelInput(value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  return input;
}

describe('EditDialogComponent', () => {
  function setup(context: Translation | null) {
    const close = vi.fn();
    TestBed.overrideComponent(EditDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(EditDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('patches the form with the given translation data', () => {
    const { component } = setup(translation({ description: 'desc', labels: ['ui'] }));

    expect(component.form.value).toEqual({ description: 'desc', labels: ['ui'] });
  });

  it('addLabel() trims and appends to the labels list', () => {
    const { component } = setup(translation());

    component.addLabel(labelInput('  ui  '));

    expect(component.form.value.labels).toEqual(['ui']);
  });

  it('addLabel() ignores a blank value', () => {
    const { component } = setup(translation());

    component.addLabel(labelInput('   '));

    expect(component.form.value.labels).toEqual([]);
  });

  it('addLabel() keeps a single label valid (the form used to require two)', () => {
    const { component } = setup(translation());

    component.addLabel(labelInput('solo'));

    expect(component.form.value.labels).toEqual(['solo']);
    expect(component.form.controls['labels'].valid).toBe(true);
  });

  it('addLabel() refuses a duplicate, a label with spaces or one too short, and keeps the text', () => {
    const { component } = setup(translation());
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
    const { component } = setup(translation());
    component.addLabel(labelInput('x'));
    const input = labelInput('valid');

    component.addLabel(input);

    expect(component.labelError()).toBeUndefined();
    expect(input.value).toBe('');
  });

  it('removeLabel() removes the given label', () => {
    const { component } = setup(translation({ labels: ['ui', 'marketing'] }));

    component.removeLabel('ui');

    expect(component.form.value.labels).toEqual(['marketing']);
  });
});

import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';

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

  it('starts with no auto-translate, and no type: translations are plain text', () => {
    const { component } = setup({ reservedKeys: [] });

    expect(component.form.value).not.toHaveProperty('type');
    expect(component.form.value.autoTranslate).toBe(false);
  });

  it('rejects an id that collides with a reserved id', () => {
    const { component } = setup({ reservedKeys: ['existing.id'] });

    component.form.controls['key'].setValue('existing.id');

    expect(component.form.controls['key'].errors).toEqual({ reservedName: true });
  });

  it('addLabel() trims and appends to an empty labels list', () => {
    const { component } = setup({ reservedKeys: [] });

    component.addLabel('  ui  ');

    expect(component.form.value.labels).toEqual(['ui']);
  });

  it('addLabel() appends to an existing labels list', () => {
    const { component } = setup({ reservedKeys: [] });
    component.addLabel('ui');

    component.addLabel('marketing');

    expect(component.form.value.labels).toEqual(['ui', 'marketing']);
  });

  it('addLabel() ignores a blank value', () => {
    const { component } = setup({ reservedKeys: [] });

    component.addLabel('   ');

    expect(component.form.value.labels).toEqual([]);
  });

  it('removeLabel() removes the given label', () => {
    const { component } = setup({ reservedKeys: [] });
    component.addLabel('ui');
    component.addLabel('marketing');

    component.removeLabel('ui');

    expect(component.form.value.labels).toEqual(['marketing']);
  });
  it('closes with the form value when saved', () => {
    const { component, close } = setup({ reservedKeys: [] });
    component.form.patchValue({ key: 'greeting', value: 'Hello' });

    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ key: 'greeting', value: 'Hello' }));
  });

  it('counts the value against the shared limit (10,000), not a hardcoded one', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { reservedKeys: [] } },
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

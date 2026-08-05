import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Translation, TranslationType } from '@shared/models/translation.model';

import { EditDialogComponent } from './edit-dialog.component';

function translation(overrides: Partial<Translation> = {}): Translation {
  return { id: 't1', type: TranslationType.STRING, locales: {}, ...overrides } as Translation;
}

describe('EditDialogComponent', () => {
  function setup(data: Translation | null) {
    TestBed.overrideComponent(EditDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(EditDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('patches the form with the given translation data', () => {
    const { component } = setup(translation({ description: 'desc', labels: ['ui'] }));

    expect(component.form.value).toEqual({ description: 'desc', labels: ['ui'] });
  });

  it('addLabel() trims and appends to the labels list', () => {
    const { component } = setup(translation());

    component.addLabel('  ui  ');

    expect(component.form.value.labels).toEqual(['ui']);
  });

  it('addLabel() ignores a blank value', () => {
    const { component } = setup(translation());

    component.addLabel('   ');

    expect(component.form.value.labels).toEqual([]);
  });

  it('removeLabel() removes the given label', () => {
    const { component } = setup(translation({ labels: ['ui', 'marketing'] }));

    component.removeLabel('ui');

    expect(component.form.value.labels).toEqual(['marketing']);
  });
});

import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

import { EditValueComponent } from './edit-value.component';

describe('EditValueComponent', () => {
  it('accepts the given form group as input', () => {
    TestBed.overrideComponent(EditValueComponent, { set: { template: '<div></div>' } });
    const fb = TestBed.inject(FormBuilder);
    const group = fb.group({ name: [''], value: [''] });

    const fixture = TestBed.createComponent(EditValueComponent);
    fixture.componentRef.setInput('form', group);
    fixture.detectChanges();

    expect(fixture.componentInstance.form()).toBe(group);
  });
});

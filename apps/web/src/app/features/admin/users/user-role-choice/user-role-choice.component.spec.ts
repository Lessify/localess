import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { USER_ROLE_OPTIONS } from '@shared/models/user-role.model';

import { UserRoleChoiceComponent } from './user-role-choice.component';

@Component({
  imports: [UserRoleChoiceComponent],
  template: '<ll-user-role-choice [control]="control" />',
})
class HostComponent {
  readonly control = new FormControl('', { nonNullable: true });
}

describe('UserRoleChoiceComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('offers None and the five roles as cards, each with what it lets the user do', () => {
    const { element } = setup();

    const titles = [...element.querySelectorAll('[hlmFieldTitle]')].map(it => it.textContent?.trim());
    expect(titles).toEqual(['None', 'Admin', 'Developer', 'Editor', 'Translator', 'Viewer']);
    for (const option of USER_ROLE_OPTIONS) {
      expect(element.querySelector(`#role-${option.id}-description`)?.textContent?.trim()).toBe(option.desc);
    }
    expect(element.querySelector('#role-NONE-description')?.textContent).toContain('No access yet');
  });

  it('shows the control value as the chosen card', async () => {
    const { fixture, element } = setup();
    fixture.componentInstance.control.setValue('EDITOR');
    fixture.detectChanges();
    await fixture.whenStable();

    expect((element.querySelector('input#role-EDITOR') as HTMLInputElement).checked).toBe(true);
    expect((element.querySelector('input#role-NONE') as HTMLInputElement).checked).toBe(false);
  });
});

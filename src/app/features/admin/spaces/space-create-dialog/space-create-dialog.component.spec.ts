import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserStore } from '@shared/stores/user.store';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { SPACE_TEMPLATES } from '../templates';

import { SpaceCreateDialogComponent } from './space-create-dialog.component';

/** Set by `setup`; the dialog now hands its result back through `BrnDialogRef.close()`. */
let close: ReturnType<typeof vi.fn>;

function userStoreStub(role: string, permissions: string[] = []) {
  return { role: signal(role), permissions: signal(permissions), isRoleAdmin: signal(role === 'admin') };
}

async function setup(store: ReturnType<typeof userStoreStub>) {
  close = vi.fn();
  await TestBed.configureTestingModule({
    imports: [SpaceCreateDialogComponent],
    providers: [
      { provide: UserStore, useValue: store },
      { provide: BrnDialogRef, useValue: { close } },
    ],
  }).compileComponents();
  const fixture: ComponentFixture<SpaceCreateDialogComponent> = TestBed.createComponent(SpaceCreateDialogComponent);
  fixture.detectChanges();
  return fixture;
}

function cards(fixture: ComponentFixture<SpaceCreateDialogComponent>): number {
  return (fixture.nativeElement as HTMLElement).querySelectorAll('hlm-radio').length;
}

describe('SpaceCreateDialogComponent', () => {
  it('offers every template to an admin', async () => {
    expect(cards(await setup(userStoreStub('admin')))).toBe(SPACE_TEMPLATES.length);
  });

  it('defaults the selection to EMPTY', async () => {
    const fixture = await setup(userStoreStub('admin'));
    expect(fixture.componentInstance.form.value.template).toBe('EMPTY');
  });

  it('starts with an empty name', async () => {
    const fixture = await setup(userStoreStub('admin'));
    expect(fixture.componentInstance.form.value.name).toBe('');
  });

  it('offers templates to a custom user holding SCHEMA_CREATE', async () => {
    expect(cards(await setup(userStoreStub('custom', ['SPACE_MANAGEMENT', 'SCHEMA_CREATE'])))).toBe(SPACE_TEMPLATES.length);
  });

  it('shows no template control at all without SCHEMA_CREATE', async () => {
    // The branch a permissions regression would silently break open, so it is asserted directly
    // rather than inferred from the admin case.
    expect(cards(await setup(userStoreStub('custom', ['SPACE_MANAGEMENT'])))).toBe(0);
  });

  it('still submits EMPTY when the template control is hidden', async () => {
    // An absent choice must mean EMPTY, not undefined - the caller looks the value up by id.
    const fixture = await setup(userStoreStub('custom', ['SPACE_MANAGEMENT']));
    expect(fixture.componentInstance.form.value.template).toBe('EMPTY');
  });
it('closes with the form value when saved', async () => {
    const fixture = await setup(userStoreStub('admin'));
    fixture.componentInstance.form.patchValue({ name: 'New Space' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space', template: 'EMPTY' });
  });
});

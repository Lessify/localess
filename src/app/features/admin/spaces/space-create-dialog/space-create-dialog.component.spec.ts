import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserStore } from '@shared/stores/user.store';

import { SpaceCreateDialogComponent } from './space-create-dialog.component';

function userStoreStub(role: string, permissions: string[] = []) {
  return { role: signal(role), permissions: signal(permissions), isRoleAdmin: signal(role === 'admin') };
}

async function setup(store: ReturnType<typeof userStoreStub>) {
  await TestBed.configureTestingModule({
    imports: [SpaceCreateDialogComponent],
    providers: [{ provide: UserStore, useValue: store }],
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
    expect(cards(await setup(userStoreStub('admin')))).toBe(3);
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
    expect(cards(await setup(userStoreStub('custom', ['SPACE_MANAGEMENT', 'SCHEMA_CREATE'])))).toBe(3);
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
});

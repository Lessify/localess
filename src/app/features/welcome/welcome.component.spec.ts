import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserPermission } from '@shared/models/user.model';
import { SpaceStore } from '@shared/stores/space.store';
import { UserStore } from '@shared/stores/user.store';

import { WelcomeComponent } from './welcome.component';

type Role = 'admin' | 'custom' | undefined;

async function setup(hasNoSpaces: boolean, role: Role = 'admin', permissions: string[] = []) {
  await TestBed.configureTestingModule({
    imports: [WelcomeComponent],
    providers: [
      provideRouter([]),
      { provide: SpaceStore, useValue: { hasNoSpaces: signal(hasNoSpaces) } },
      { provide: UserStore, useValue: { role: signal(role), permissions: signal(permissions) } },
    ],
  }).compileComponents();
  const fixture: ComponentFixture<WelcomeComponent> = TestBed.createComponent(WelcomeComponent);
  fixture.detectChanges();
  // The permission pipe resolves through `toObservable`, so the async pipe needs a second pass.
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture };
}

function el(fixture: ComponentFixture<WelcomeComponent>, testId: string): Element | null {
  return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
}

describe('WelcomeComponent', () => {
  it('invites an admin with no spaces to create one', async () => {
    const { fixture } = await setup(true);
    expect(el(fixture, 'create-first-space')).not.toBeNull();
  });

  it('links to the spaces list with the create action, rather than opening a dialog itself', async () => {
    // The URL is what opens the dialog, so every entry point is a link. Nothing here can collect a
    // filled-in form and drop it.
    const { fixture } = await setup(true);

    expect(el(fixture, 'create-first-space')?.getAttribute('href')).toBe('/features/admin/spaces?action=create');
  });

  it('does not nag a user who already has a space', async () => {
    const { fixture } = await setup(false);
    expect(el(fixture, 'create-first-space')).toBeNull();
    expect(el(fixture, 'no-space-access')).toBeNull();
  });

  it('offers creation to a custom user who may manage spaces', async () => {
    const { fixture } = await setup(true, 'custom', [UserPermission.SPACE_MANAGEMENT]);
    expect(el(fixture, 'create-first-space')).not.toBeNull();
  });

  it('explains itself to a user who has no spaces and may not create one', async () => {
    // firestore.rules requires SPACE_MANAGEMENT, so the button would fail. Hiding it without
    // saying anything would leave this user on a blank page with no reason given.
    const { fixture } = await setup(true, 'custom', [UserPermission.TRANSLATION_READ]);

    expect(el(fixture, 'create-first-space')).toBeNull();
    expect(el(fixture, 'no-space-access')).not.toBeNull();
  });

  it('keeps the documentation links regardless', async () => {
    const { fixture } = await setup(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Next Steps');
  });
});

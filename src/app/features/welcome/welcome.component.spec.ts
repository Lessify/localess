import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SpaceStore } from '@shared/stores/space.store';
import { vi } from 'vitest';

import { WelcomeComponent } from './welcome.component';

async function setup(hasNoSpaces: boolean) {
  const open = vi.fn();
  await TestBed.configureTestingModule({
    imports: [WelcomeComponent],
    providers: [
      { provide: SpaceStore, useValue: { hasNoSpaces: signal(hasNoSpaces) } },
      { provide: MatDialog, useValue: { open } },
    ],
  }).compileComponents();
  const fixture: ComponentFixture<WelcomeComponent> = TestBed.createComponent(WelcomeComponent);
  fixture.detectChanges();
  return { fixture, open };
}

function cta(fixture: ComponentFixture<WelcomeComponent>): Element | null {
  return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="create-first-space"]');
}

describe('WelcomeComponent', () => {
  it('invites the user to create a space when they have none', async () => {
    const { fixture } = await setup(true);
    expect(cta(fixture)).not.toBeNull();
  });

  it('does not nag a user who already has a space', async () => {
    const { fixture } = await setup(false);
    expect(cta(fixture)).toBeNull();
  });

  it('keeps the documentation links regardless', async () => {
    const { fixture } = await setup(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Next Steps');
  });

  it('opens the same dialog the shell and Admin use, so there is one creation flow', async () => {
    const { fixture, open } = await setup(true);

    fixture.componentInstance.openCreateSpace();

    expect(open).toHaveBeenCalled();
  });
});

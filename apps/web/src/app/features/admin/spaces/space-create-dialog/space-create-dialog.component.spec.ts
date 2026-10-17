import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpaceService } from '@core/services/space.service';
import { SpaceTemplateSummary } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SpaceCreateDialogComponent } from './space-create-dialog.component';

const EMPTY: SpaceTemplateSummary = { id: 'EMPTY', name: 'Empty', description: 'A blank space.', icon: 'lucideFile' };
const ALL: SpaceTemplateSummary[] = [
  EMPTY,
  { id: 'BLOG', name: 'Blog', description: 'Posts.', icon: 'lucideNewspaper' },
  { id: 'ECOMMERCE', name: 'E-Commerce', description: 'Products.', icon: 'lucideShoppingCart' },
  { id: 'TRANSLATIONS_LARGE', name: 'Translations (large)', description: 'For testing.', icon: 'lucideLanguages' },
];

/** Set by `setup`; the dialog hands its result back through `BrnDialogRef.close()`. */
let close: ReturnType<typeof vi.fn>;

/** The server decides what is offered (`GET /api/app/spaces/templates`): by permission and by LOCALESS_TEST_TEMPLATES. */
async function setup(offered: SpaceTemplateSummary[] | Observable<SpaceTemplateSummary[]>) {
  close = vi.fn();
  const templates = () => (Array.isArray(offered) ? of(offered) : offered);
  await TestBed.configureTestingModule({
    imports: [SpaceCreateDialogComponent],
    providers: [
      { provide: SpaceService, useValue: { templates } },
      { provide: BrnDialogRef, useValue: { close } },
    ],
  }).compileComponents();
  const fixture: ComponentFixture<SpaceCreateDialogComponent> = TestBed.createComponent(SpaceCreateDialogComponent);
  fixture.detectChanges();
  return fixture;
}

function cards(fixture: ComponentFixture<SpaceCreateDialogComponent>): string[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('[hlmFieldTitle]')].map(it => it.textContent?.trim() ?? '');
}

describe('SpaceCreateDialogComponent', () => {
  it('offers the templates the server lists, in its order', async () => {
    expect(cards(await setup(ALL))).toEqual(['Empty', 'Blog', 'E-Commerce', 'Translations (large)']);
  });

  it('defaults the selection to EMPTY', async () => {
    const fixture = await setup(ALL);
    expect(fixture.componentInstance.form.value.template).toBe('EMPTY');
  });

  it('starts with an empty name', async () => {
    const fixture = await setup(ALL);
    expect(fixture.componentInstance.form.value.name).toBe('');
  });

  it('shows no template control when the server offers only Empty', async () => {
    const fixture = await setup([EMPTY]);
    expect(cards(fixture)).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).querySelector('fieldset')).toBeNull();
  });

  it('still submits EMPTY when the template control is hidden', async () => {
    const fixture = await setup([EMPTY]);
    fixture.componentInstance.form.patchValue({ name: 'New Space' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space', template: 'EMPTY' });
  });

  it('still creates an empty space when the templates can not be loaded', async () => {
    // A failed list (network, expired session) must not break the dialog: the name alone is enough.
    const fixture = await setup(throwError(() => new Error('offline')));
    expect(cards(fixture)).toEqual([]);
    fixture.componentInstance.form.patchValue({ name: 'New Space' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space', template: 'EMPTY' });
  });

  it('closes with the chosen template when saved', async () => {
    const fixture = await setup(ALL);
    fixture.componentInstance.form.patchValue({ name: 'New Space', template: 'BLOG' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space', template: 'BLOG' });
  });
});

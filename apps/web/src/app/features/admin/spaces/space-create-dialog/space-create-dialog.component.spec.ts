import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpaceService } from '@core/services/space.service';
import { SPACE_TEMPLATE_IDS, SpaceTemplateId } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SpaceCreateDialogComponent } from './space-create-dialog.component';
import { SPACE_TEMPLATE_VIEWS } from './space-templates';

const SOME: SpaceTemplateId[] = ['blog', 'ecommerce', 'translations_large'];

/** Set by `setup`; the dialog hands its result back through `BrnDialogRef.close()`. */
let close: ReturnType<typeof vi.fn>;

/** The server decides what is offered (`GET /api/app/spaces/templates`): by permission and by LOCALESS_TEST_TEMPLATES. */
async function setup(offered: SpaceTemplateId[] | Observable<SpaceTemplateId[]>) {
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
  it('offers Empty, then the templates the server lists, in its order', async () => {
    expect(cards(await setup(SOME))).toEqual(['Empty', 'Blog', 'E-Commerce', 'Translations (large)']);
  });

  it('has a title, description and icon for every template id', () => {
    for (const id of SPACE_TEMPLATE_IDS) {
      const view = SPACE_TEMPLATE_VIEWS[id];
      expect(view.name.length, id).toBeGreaterThan(0);
      expect(view.description.length, id).toBeGreaterThan(0);
      expect(view.icon, id).toMatch(/^lucide/);
    }
  });

  it('starts with an empty name and Empty selected', async () => {
    const fixture = await setup(SOME);
    expect(fixture.componentInstance.form.value.name).toBe('');
    expect(fixture.componentInstance.form.value.template).toBe('');
  });

  it('sends no template for Empty', async () => {
    const fixture = await setup(SOME);
    fixture.componentInstance.form.patchValue({ name: 'New Space' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space' });
  });

  it('shows no template control when the server offers none', async () => {
    const fixture = await setup([]);
    expect(cards(fixture)).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).querySelector('fieldset')).toBeNull();
    fixture.componentInstance.form.patchValue({ name: 'New Space' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space' });
  });

  it('still creates a space when the templates can not be loaded', async () => {
    // A failed list (network, expired session) must not break the dialog: the name alone is enough.
    const fixture = await setup(throwError(() => new Error('offline')));
    expect(cards(fixture)).toEqual([]);
    fixture.componentInstance.form.patchValue({ name: 'New Space' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space' });
  });

  it('closes with the chosen template when saved', async () => {
    const fixture = await setup(SOME);
    fixture.componentInstance.form.patchValue({ name: 'New Space', template: 'blog' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'New Space', template: 'blog' });
  });
});

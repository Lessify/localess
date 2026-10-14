import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Content, ContentKind } from '@localess/shared';

import { ContentValidator } from '../shared/content.validator';
import { EditDialogContext } from './edit-dialog.model';
import { EditDialogComponent } from './edit-dialog.component';

function folder(overrides: Partial<Content> = {}): Content {
  return { id: 'c1', kind: ContentKind.FOLDER, name: 'Folder', slug: 'folder', ...overrides } as Content;
}

describe('EditDialogComponent', () => {
  function setup(context: EditDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(EditDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(EditDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('patches the form from the given content', () => {
    const { component } = setup({ content: folder({ name: 'Folder', slug: 'folder' }), reservedNames: [], reservedSlugs: [] });

    expect(component.form.value).toEqual({ name: 'Folder', slug: 'folder' });
    expect(component.form.valid).toBe(true);
  });

  it('allows keeping the current name/slug even though they appear in reserved lists', () => {
    const { component } = setup({
      content: folder({ name: 'Folder', slug: 'folder' }),
      reservedNames: ['Folder'],
      reservedSlugs: ['folder'],
    });

    expect(component.form.controls['name'].errors).toBeNull();
    expect(component.form.controls['slug'].errors).toBeNull();
  });

  it('rejects renaming to a different reserved name/slug', () => {
    const { component } = setup({
      content: folder({ name: 'Folder', slug: 'folder' }),
      reservedNames: ['Other'],
      reservedSlugs: ['other'],
    });

    component.form.controls['name'].setValue('Other');
    component.form.controls['slug'].setValue('other');

    expect(component.form.controls['name'].errors).toEqual({ reservedName: true });
    expect(component.form.controls['slug'].errors).toEqual({ reservedName: true });
  });

  it('lets a name and slug be as long as when they were created (the validator limit, not 50)', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { content: folder({ name: 'N'.repeat(120), slug: 's'.repeat(120) }), reservedNames: [], reservedSlugs: [] } },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(EditDialogComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.form.valid).toBe(true);
    for (const id of ['name', 'slug']) {
      expect(el.querySelector(`#${id}`)?.getAttribute('maxlength')).toBe(String(ContentValidator.MAX_LENGTH));
    }
    expect(el.textContent?.replace(/\s+/g, '')).toContain(`120/${ContentValidator.MAX_LENGTH}`);
  });
});

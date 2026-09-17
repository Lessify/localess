import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { SpaceEditDialogComponent } from './space-edit-dialog.component';
import { SpaceEditDialogContext } from './space-edit-dialog.model';

let close: ReturnType<typeof vi.fn>;

async function setup(context: SpaceEditDialogContext) {
  close = vi.fn();
  await TestBed.configureTestingModule({
    imports: [SpaceEditDialogComponent],
    providers: [
      { provide: DIALOG_DATA, useValue: context },
      { provide: BrnDialogRef, useValue: { close } },
    ],
  }).compileComponents();
  const fixture: ComponentFixture<SpaceEditDialogComponent> = TestBed.createComponent(SpaceEditDialogComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SpaceEditDialogComponent', () => {
  it('patches the existing name', async () => {
    const fixture = await setup({ name: 'Existing' });
    expect(fixture.componentInstance.form.value.name).toBe('Existing');
  });

  it('never renders a template control', async () => {
    // A template applies to a new space only. Splitting the dialogs is what makes this
    // structurally true rather than a condition someone could accidentally invert.
    const fixture = await setup({ name: 'Existing' });
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('hlm-radio').length).toBe(0);
  });

  it('submits only a name, with no template field to confuse the update payload', async () => {
    const fixture = await setup({ name: 'Existing' });
    expect(Object.keys(fixture.componentInstance.form.value)).toEqual(['name']);
  });
it('closes with the form value when saved', async () => {
    const fixture = await setup({ name: 'Existing' });
    fixture.componentInstance.form.patchValue({ name: 'Renamed' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'Renamed' });
  });
});

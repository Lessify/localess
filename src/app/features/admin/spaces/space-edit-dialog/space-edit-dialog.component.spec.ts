import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { SpaceEditDialogComponent } from './space-edit-dialog.component';
import { SpaceEditDialogModel } from './space-edit-dialog.model';

async function setup(data: SpaceEditDialogModel) {
  await TestBed.configureTestingModule({
    imports: [SpaceEditDialogComponent],
    providers: [{ provide: MAT_DIALOG_DATA, useValue: data }],
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
});

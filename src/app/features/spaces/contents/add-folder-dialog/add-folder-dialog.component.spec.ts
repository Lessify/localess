import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AddFolderDialogModel } from './add-folder-dialog.model';
import { AddFolderDialogComponent } from './add-folder-dialog.component';

describe('AddFolderDialogComponent', () => {
  function setup(data: AddFolderDialogModel) {
    TestBed.overrideComponent(AddFolderDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(AddFolderDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  it('starts with empty, invalid name/slug controls', () => {
    const { component } = setup({ reservedNames: [], reservedSlugs: [] });

    expect(component.form.value).toEqual({ name: '', slug: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('auto-generates the slug from the name while untouched', () => {
    const { component, fixture } = setup({ reservedNames: [], reservedSlugs: [] });

    component.form.controls['name'].setValue('My Folder');
    fixture.detectChanges();

    expect(component.form.value.slug).toBe('my-folder');
  });

  it('stops auto-generating the slug once touched', () => {
    const { component, fixture } = setup({ reservedNames: [], reservedSlugs: [] });

    component.form.controls['slug'].markAsTouched();
    component.form.controls['name'].setValue('My Folder');
    fixture.detectChanges();

    expect(component.form.value.slug).toBe('');
  });

  it('rejects a reserved name/slug', () => {
    const { component } = setup({ reservedNames: ['Existing'], reservedSlugs: ['existing'] });

    component.form.controls['name'].setValue('Existing');
    component.form.controls['slug'].setValue('existing');

    expect(component.form.controls['name'].errors).toEqual({ reservedName: true });
    expect(component.form.controls['slug'].errors).toEqual({ reservedName: true });
  });

  it('normalizeSlug() reformats the current slug value', () => {
    const { component } = setup({ reservedNames: [], reservedSlugs: [] });
    component.form.controls['slug'].setValue('My Folder');

    component.normalizeSlug();

    expect(component.form.value.slug).toBe('my-folder');
  });

  it('normalizeSlug() does nothing when the slug is empty', () => {
    const { component } = setup({ reservedNames: [], reservedSlugs: [] });

    component.normalizeSlug();

    expect(component.form.value.slug).toBe('');
  });
});

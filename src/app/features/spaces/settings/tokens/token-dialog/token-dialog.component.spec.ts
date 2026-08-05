import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TokenForm, TokenPermission } from '@shared/models/token.model';

import { TokenDialogComponent } from './token-dialog.component';

describe('TokenDialogComponent', () => {
  function setup(data: TokenForm | undefined) {
    TestBed.overrideComponent(TokenDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(TokenDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('starts with empty defaults when there is no data', () => {
    const { component } = setup(undefined);

    expect(component.form.value).toEqual({ name: '', permissions: [], cacheTtl: null });
  });

  it('prefills the form from the given token data', () => {
    const { component } = setup({ name: 'CI', permissions: [TokenPermission.CONTENT_DRAFT], cacheTtl: 60 });

    expect(component.form.value).toEqual({ name: 'CI', permissions: [TokenPermission.CONTENT_DRAFT], cacheTtl: 60 });
  });

  it('isPermissionSelected() reflects the current permissions list', () => {
    const { component } = setup({ name: 'CI', permissions: [TokenPermission.CONTENT_DRAFT] });

    expect(component.isPermissionSelected(TokenPermission.CONTENT_DRAFT)).toBe(true);
    expect(component.isPermissionSelected(TokenPermission.DEV_TOOLS)).toBe(false);
  });

  it('togglePermission() adds a permission when checked', () => {
    const { component } = setup(undefined);

    component.togglePermission(TokenPermission.CONTENT_DRAFT, true);

    expect(component.form.value.permissions).toEqual([TokenPermission.CONTENT_DRAFT]);
  });

  it('togglePermission() removes a permission when unchecked', () => {
    const { component } = setup({ name: 'CI', permissions: [TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS] });

    component.togglePermission(TokenPermission.CONTENT_DRAFT, false);

    expect(component.form.value.permissions).toEqual([TokenPermission.DEV_TOOLS]);
  });

  it('resetCacheTtl() clears the cacheTtl control', () => {
    const { component } = setup({ name: 'CI', permissions: [], cacheTtl: 60 });

    component.resetCacheTtl();

    expect(component.form.value.cacheTtl).toBeNull();
  });
});

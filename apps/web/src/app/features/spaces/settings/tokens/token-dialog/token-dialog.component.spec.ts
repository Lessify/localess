import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TokenType } from '@localess/shared';
import { TokenForm } from '@shared/models/token.model';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { TokenDialogComponent } from './token-dialog.component';

describe('TokenDialogComponent', () => {
  /** What Spartan injects when the caller passes no context: never undefined, always an object with `close`. */
  const CREATE_CONTEXT = { close: () => undefined };

  function setup(context: TokenForm | typeof CREATE_CONTEXT) {
    const close = vi.fn();
    TestBed.overrideComponent(TokenDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(TokenDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('starts as a public token with empty defaults', () => {
    const { component } = setup(CREATE_CONTEXT);

    expect(component.form.getRawValue()).toEqual({ name: '', type: TokenType.PUBLIC, cacheTtl: null });
    expect(component.form.controls.type.enabled).toBe(true);
    expect(component.isEdit).toBe(false);
  });

  it('prefills on edit and locks the type', () => {
    const { component } = setup({ name: 'CI', type: TokenType.PREVIEW, cacheTtl: 60 });

    expect(component.form.getRawValue()).toEqual({ name: 'CI', type: TokenType.PREVIEW, cacheTtl: 60 });
    expect(component.form.controls.type.disabled).toBe(true);
    expect(component.isEdit).toBe(true);
  });

  it('hides and clears the cache TTL for management tokens', () => {
    const { component } = setup(CREATE_CONTEXT);
    component.form.controls.cacheTtl.setValue(30);

    component.form.controls.type.setValue(TokenType.MANAGEMENT);

    expect(component.showCacheTtl()).toBe(false);
    expect(component.form.controls.cacheTtl.value).toBeNull();
    component.form.controls.type.setValue(TokenType.PREVIEW);
    expect(component.showCacheTtl()).toBe(true);
  });

  it('offers the three types as choice cards', () => {
    const { component } = setup(CREATE_CONTEXT);

    expect(component.types.map(it => it.type)).toEqual([TokenType.PUBLIC, TokenType.PREVIEW, TokenType.MANAGEMENT]);
  });

  it('resetCacheTtl() clears the cacheTtl control', () => {
    const { component } = setup({ name: 'CI', type: TokenType.PUBLIC, cacheTtl: 60 });

    component.resetCacheTtl();

    expect(component.form.value.cacheTtl).toBeNull();
  });

  it('closes with name, type and cache TTL', () => {
    const { component, close } = setup(CREATE_CONTEXT);
    component.form.setValue({ name: 'Site', type: TokenType.PREVIEW, cacheTtl: 5 });

    component.save();

    expect(close).toHaveBeenCalledWith({ name: 'Site', type: TokenType.PREVIEW, cacheTtl: 5 });
  });

  it('closes with the locked type on edit', () => {
    const { component, close } = setup({ name: 'CI', type: TokenType.MANAGEMENT });

    component.save();

    expect(close).toHaveBeenCalledWith({ name: 'CI', type: TokenType.MANAGEMENT, cacheTtl: null });
  });
});

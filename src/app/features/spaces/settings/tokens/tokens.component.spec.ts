import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Space } from '@shared/models/space.model';
import { Token, TokenPermission } from '@shared/models/token.model';
import { NotificationService } from '@shared/services/notification.service';
import { TokenService } from '@shared/services/token.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TokensComponent } from './tokens.component';

function space(): Space {
  return { id: 'space-1', name: 'Space 1' } as Space;
}

function token(overrides: Partial<Token> = {}): Token {
  return { id: 't1', name: 'CI', version: 2, permissions: [TokenPermission.CONTENT_DRAFT], ...overrides } as unknown as Token;
}

describe('TokensComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(tokens: Token[], selectedSpace: Space | undefined) {
    const findAll = vi.fn().mockReturnValue(of(tokens));
    const create = vi.fn().mockReturnValue(of(undefined));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteToken = vi.fn().mockReturnValue(of(undefined));
    const regenerate = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(TokensComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: { findAll, create, update, delete: deleteToken, regenerate } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
        { provide: SpaceStore, useValue: { selectedSpace: signal(selectedSpace), selectedSpaceId: signal('space-1') } },
      ],
    });
    const fixture = TestBed.createComponent(TokensComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, findAll, create, update, deleteToken, regenerate, success, error, open };
  }

  it('starts loading until a space is selected', () => {
    const { component } = setup([], undefined);

    expect(component.isLoading()).toBe(true);
  });

  it('loads tokens once the space arrives', () => {
    const tokens = [token({ id: 't1' })];
    const { component, findAll } = setup(tokens, space());

    expect(findAll).toHaveBeenCalledWith('space-1');
    expect(component.dataSource.filteredData()).toEqual(tokens);
    expect(component.isLoading()).toBe(false);
  });

  it('onFilterChange() serializes the filter value onto the data source', () => {
    const { component } = setup([], space());

    component.onFilterChange({ search: 'ci' });

    expect(component.dataSource.filter).toBe(JSON.stringify({ search: 'ci' }));
  });

  it('openAddDialog() creates the token and notifies success when confirmed', () => {
    const { component, open, create, success } = setup([], space());
    const model = { name: 'CI', permissions: [TokenPermission.CONTENT_DRAFT] };
    open.mockReturnValue({ afterClosed: () => of(model) });

    component.openAddDialog();

    expect(create).toHaveBeenCalledWith('space-1', model);
    expect(success).toHaveBeenCalledWith('Token has been created.');
  });

  it('openAddDialog() does nothing when dismissed', () => {
    const { component, open, create } = setup([], space());
    open.mockReturnValue({ afterClosed: () => of(undefined) });

    component.openAddDialog();

    expect(create).not.toHaveBeenCalled();
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, open, create, error } = setup([], space());
    create.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of({ name: 'CI', permissions: [] }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Token can not be created.');
  });

  it('openEditDialog() prefills from a v2 token and updates on confirm', () => {
    const { component, open, update, success } = setup([], space());
    const element = token({ id: 't1' });
    open.mockReturnValue({ afterClosed: () => of({ name: 'Renamed', permissions: [] }) });

    component.openEditDialog(element);

    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: { name: 'CI', permissions: [TokenPermission.CONTENT_DRAFT], cacheTtl: undefined } }),
    );
    expect(update).toHaveBeenCalledWith('space-1', 't1', { name: 'Renamed', permissions: [] });
    expect(success).toHaveBeenCalledWith('Token has been created.');
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup([], space());
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of({ name: 'Renamed', permissions: [] }) });

    component.openEditDialog(token({ id: 't1' }));

    expect(error).toHaveBeenCalledWith('Token can not be created.');
  });

  it('openDeleteDialog() deletes and notifies success when confirmed', () => {
    const { component, open, deleteToken, success } = setup([], space());
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDeleteDialog(token({ id: 't1', name: 'CI' }));

    expect(deleteToken).toHaveBeenCalledWith('space-1', 't1');
    expect(success).toHaveBeenCalledWith("Token 'CI' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteToken } = setup([], space());
    open.mockReturnValue({ afterClosed: () => of(false) });

    component.openDeleteDialog(token({ id: 't1' }));

    expect(deleteToken).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteToken, error } = setup([], space());
    deleteToken.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDeleteDialog(token({ id: 't1', name: 'CI' }));

    expect(error).toHaveBeenCalledWith("Token 'CI' can not be deleted.");
  });

  it('openRegenerateDialog() regenerates and notifies success when confirmed', () => {
    const { component, open, regenerate, success } = setup([], space());
    open.mockReturnValue({ afterClosed: () => of(true) });
    const element = token({ id: 't1', name: 'CI' });

    component.openRegenerateDialog(element);

    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: {
          title: 'Regenerate Token',
          content:
            "Are you sure you want to regenerate the token 'CI'? All clients using the current token will immediately lose access and must be updated with the new token.",
        },
      }),
    );
    expect(regenerate).toHaveBeenCalledWith('space-1', element);
    expect(success).toHaveBeenCalledWith("Token 'CI' has been regenerated.");
  });

  it('openRegenerateDialog() does not regenerate when cancelled', () => {
    const { component, open, regenerate } = setup([], space());
    open.mockReturnValue({ afterClosed: () => of(false) });

    component.openRegenerateDialog(token({ id: 't1' }));

    expect(regenerate).not.toHaveBeenCalled();
  });

  it('openRegenerateDialog() notifies an error on failure', () => {
    const { component, open, regenerate, error } = setup([], space());
    regenerate.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ afterClosed: () => of(true) });

    component.openRegenerateDialog(token({ id: 't1', name: 'CI' }));

    expect(error).toHaveBeenCalledWith("Token 'CI' can not be regenerated.");
  });

  it('permissionsToText() joins the permission labels with newlines', () => {
    const { component } = setup([], space());

    const text = component.permissionsToText([TokenPermission.CONTENT_DRAFT, TokenPermission.TRANSLATION_PUBLIC]);

    expect(text).toBe('Content Draft\nTranslation Public');
  });

  it('copied() notifies success', () => {
    const { component, success } = setup([], space());

    component.copied();

    expect(success).toHaveBeenCalledWith('Token ID copied to clipboard.');
  });
});

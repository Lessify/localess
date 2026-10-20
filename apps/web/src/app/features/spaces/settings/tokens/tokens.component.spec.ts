import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Space, Token, TokenType } from '@localess/shared';
import { NotificationService } from '@core/services/notification.service';
import { SpaceTokenService } from '@core/services/space-token.service';
import { SpaceStore } from '@core/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TokenSecretDialogComponent } from './token-secret-dialog/token-secret-dialog.component';
import { TokensComponent } from './tokens.component';

function space(): Space {
  return { id: 'space-1', name: 'Space 1' } as Space;
}

function token(overrides: Partial<Token> = {}): Token {
  return { id: 't1', name: 'CI', type: TokenType.PREVIEW, hint: 'prv_…abcd', token: 'prv_x', ...overrides } as Token;
}

describe('TokensComponent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(tokens: Token[], selectedSpace: Space | undefined) {
    const findAll = vi.fn().mockReturnValue(of(tokens));
    const create = vi.fn().mockReturnValue(of(token()));
    const update = vi.fn().mockReturnValue(of(undefined));
    const deleteToken = vi.fn().mockReturnValue(of(undefined));
    const regenerate = vi.fn().mockReturnValue(of(token()));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();

    TestBed.overrideComponent(TokensComponent, {
      set: { template: '<table llTableSort></table><ll-paginator [length]="0" />' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceTokenService, useValue: { findAll, create, update, remove: deleteToken, regenerate } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: HlmDialogService, useValue: { open } },
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
    const model = { name: 'CI', type: TokenType.PREVIEW };
    open.mockReturnValue({ closed$: of(model) });

    component.openAddDialog();

    expect(create).toHaveBeenCalledWith('space-1', model);
    expect(success).toHaveBeenCalledWith('Token has been created.');
  });

  it('openAddDialog() does nothing when dismissed', () => {
    const { component, open, create } = setup([], space());
    open.mockReturnValue({ closed$: of(undefined) });

    component.openAddDialog();

    expect(create).not.toHaveBeenCalled();
  });

  it('openAddDialog() notifies an error on failure', () => {
    const { component, open, create, error } = setup([], space());
    create.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ name: 'CI', type: TokenType.PUBLIC }) });

    component.openAddDialog();

    expect(error).toHaveBeenCalledWith('Token can not be created.');
  });

  it('openEditDialog() prefills from the token and updates the name and cache TTL on confirm', () => {
    const { component, open, update, success } = setup([], space());
    const element = token({ id: 't1' });
    open.mockReturnValue({ closed$: of({ name: 'Renamed', type: TokenType.PREVIEW, cacheTtl: 5 }) });

    component.openEditDialog(element);

    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ context: { name: 'CI', type: TokenType.PREVIEW, cacheTtl: undefined } }),
    );
    expect(update).toHaveBeenCalledWith('space-1', 't1', { name: 'Renamed', cacheTtl: 5 });
    expect(success).toHaveBeenCalledWith('Token has been updated.');
  });

  it('openEditDialog() prefills the name, type and cache TTL of the token', () => {
    const { component, open } = setup([], space());
    const element = token({ name: 'Website', type: TokenType.PUBLIC, cacheTtl: 120 });
    open.mockReturnValue({ closed$: of(undefined) });

    component.openEditDialog(element);

    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ context: { name: 'Website', type: TokenType.PUBLIC, cacheTtl: 120 } }),
    );
  });

  it('openEditDialog() notifies an error on failure', () => {
    const { component, open, update, error } = setup([], space());
    update.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of({ name: 'Renamed', type: TokenType.PREVIEW }) });

    component.openEditDialog(token({ id: 't1' }));

    expect(error).toHaveBeenCalledWith('Token can not be updated.');
  });

  it('openDeleteDialog() deletes and notifies success when confirmed', () => {
    const { component, open, deleteToken, success } = setup([], space());
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(token({ id: 't1', name: 'CI' }));

    expect(deleteToken).toHaveBeenCalledWith('space-1', 't1');
    expect(success).toHaveBeenCalledWith("Token 'CI' has been deleted.");
  });

  it('openDeleteDialog() does not delete when cancelled', () => {
    const { component, open, deleteToken } = setup([], space());
    open.mockReturnValue({ closed$: of(undefined) });

    component.openDeleteDialog(token({ id: 't1' }));

    expect(deleteToken).not.toHaveBeenCalled();
  });

  it('openDeleteDialog() notifies an error on failure', () => {
    const { component, open, deleteToken, error } = setup([], space());
    deleteToken.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of(true) });

    component.openDeleteDialog(token({ id: 't1', name: 'CI' }));

    expect(error).toHaveBeenCalledWith("Token 'CI' can not be deleted.");
  });

  it('openRegenerateDialog() regenerates and notifies success when confirmed', () => {
    const { component, open, regenerate, success } = setup([], space());
    open.mockReturnValue({ closed$: of(true) });
    const element = token({ id: 't1', name: 'CI' });

    component.openRegenerateDialog(element);

    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        context: {
          title: 'Regenerate Token',
          content:
            "Are you sure you want to regenerate the token 'CI'? All clients using the current token will immediately lose access and must be updated with the new token.",
          // Nothing is deleted, but every existing client irreversibly loses access.
          variant: 'destructive',
        },
      }),
    );
    expect(regenerate).toHaveBeenCalledWith('space-1', element);
    expect(success).toHaveBeenCalledWith("Token 'CI' has been regenerated.");
  });

  it('openRegenerateDialog() does not regenerate when cancelled', () => {
    const { component, open, regenerate } = setup([], space());
    open.mockReturnValue({ closed$: of(undefined) });

    component.openRegenerateDialog(token({ id: 't1' }));

    expect(regenerate).not.toHaveBeenCalled();
  });

  it('openRegenerateDialog() notifies an error on failure', () => {
    const { component, open, regenerate, error } = setup([], space());
    regenerate.mockReturnValue(throwError(() => new Error('boom')));
    open.mockReturnValue({ closed$: of(true) });

    component.openRegenerateDialog(token({ id: 't1', name: 'CI' }));

    expect(error).toHaveBeenCalledWith("Token 'CI' can not be regenerated.");
  });

  it('shows the columns hint, name, type, cache TTL, updated at and actions', () => {
    const { component } = setup([], space());

    expect(component.displayedColumns).toEqual(['hint', 'name', 'type', 'cacheTtl', 'updatedAt', 'actions']);
  });

  it('shows a new management token once, with its CLI login command', () => {
    const { component, open, create } = setup([], space());
    open.mockReturnValueOnce({ closed$: of({ name: 'CI', type: TokenType.MANAGEMENT }) });
    create.mockReturnValue(of(token({ name: 'CI', type: TokenType.MANAGEMENT, token: 'mgt_x' })));

    component.openAddDialog();

    expect(open).toHaveBeenLastCalledWith(
      TokenSecretDialogComponent,
      expect.objectContaining({
        context: {
          name: 'CI',
          token: 'mgt_x',
          cliLogin: `localess login --origin ${window.location.origin} --space space-1 --token mgt_x`,
        },
      }),
    );
  });

  it('opens the secret dialog so that only its own button closes it (no Escape, outside click or ✕)', () => {
    const { component, open, create } = setup([], space());
    open.mockReturnValueOnce({ closed$: of({ name: 'CI', type: TokenType.MANAGEMENT }) });
    create.mockReturnValue(of(token({ name: 'CI', type: TokenType.MANAGEMENT, token: 'mgt_x' })));

    component.openAddDialog();

    expect(open).toHaveBeenLastCalledWith(
      TokenSecretDialogComponent,
      expect.objectContaining({ disableClose: true, closeOnOutsidePointerEvents: false, showCloseButton: false }),
    );
  });

  it('does not open the secret dialog for a public or preview token', () => {
    const { component, open, create } = setup([], space());
    open.mockReturnValueOnce({ closed$: of({ name: 'Site', type: TokenType.PUBLIC }) });
    create.mockReturnValue(of(token({ type: TokenType.PUBLIC, token: 'pub_x' })));

    component.openAddDialog();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('shows a regenerated management token once', () => {
    const { component, open, regenerate } = setup([], space());
    open.mockReturnValueOnce({ closed$: of(true) });
    regenerate.mockReturnValue(of(token({ name: 'CI', type: TokenType.MANAGEMENT, token: 'mgt_new' })));

    component.openRegenerateDialog(token({ name: 'CI', type: TokenType.MANAGEMENT, token: undefined }));

    expect(open).toHaveBeenLastCalledWith(
      TokenSecretDialogComponent,
      expect.objectContaining({ context: expect.objectContaining({ token: 'mgt_new' }) }),
    );
  });

  it('copied() notifies success', () => {
    const { component, success } = setup([], space());

    component.copied();

    expect(success).toHaveBeenCalledWith('Token copied to clipboard.');
  });
});

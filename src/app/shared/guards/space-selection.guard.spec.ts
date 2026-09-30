import { signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceStore } from '@shared/stores/space.store';
import { firstValueFrom, Observable } from 'rxjs';
import { vi } from 'vitest';

import { spaceSelectionGuard } from './space-selection.guard';

describe('spaceSelectionGuard', () => {
  function space(id: string): Space {
    return { id, name: `Space ${id}` } as Space;
  }

  function setup(spaces: Space[], selectedSpaceId: string | undefined, loaded = true) {
    const loadedSignal = signal(loaded);
    const selected = signal(selectedSpaceId);
    const changeSpace = vi.fn((it: Space) => selected.set(it.id));
    const warning = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SpaceStore,
          useFactory: () => ({
            loaded$: toObservable(loadedSignal),
            spaces: signal(spaces),
            selectedSpaceId: selected,
            changeSpace,
          }),
        },
        { provide: NotificationService, useValue: { warning } },
      ],
    });
    return { loadedSignal, changeSpace, warning };
  }

  function run(spaceId: string): Observable<boolean | UrlTree> {
    const route = { paramMap: convertToParamMap({ spaceId }) } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => spaceSelectionGuard(route, {} as RouterStateSnapshot)) as Observable<boolean | UrlTree>;
  }

  function urlOf(result: boolean | UrlTree): string {
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  it('selects the space named in the URL when it differs from the stored one', async () => {
    const { changeSpace } = setup([space('a'), space('b')], 'a');

    expect(await firstValueFrom(run('b'))).toBe(true);
    expect(changeSpace).toHaveBeenCalledWith(space('b'));
  });

  it('leaves the selection alone when the URL names the stored space', async () => {
    const { changeSpace } = setup([space('a'), space('b')], 'a');

    expect(await firstValueFrom(run('a'))).toBe(true);
    expect(changeSpace).not.toHaveBeenCalled();
  });

  it('redirects to the stored space and warns when the URL names an unknown space', async () => {
    const { changeSpace, warning } = setup([space('a'), space('b')], 'b');

    expect(urlOf(await firstValueFrom(run('missing')))).toBe('/features/spaces/b/dashboard');
    expect(changeSpace).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalled();
  });

  it('falls back to the first space when the stored one no longer exists, so it cannot redirect in a loop', async () => {
    setup([space('a')], 'gone');

    expect(urlOf(await firstValueFrom(run('missing')))).toBe('/features/spaces/a/dashboard');
  });

  it('redirects to welcome when there are no spaces at all', async () => {
    setup([], undefined);

    expect(urlOf(await firstValueFrom(run('missing')))).toBe('/features/welcome');
  });

  it('waits for the spaces to load before deciding', async () => {
    const { loadedSignal, changeSpace } = setup([space('a'), space('b')], 'a', false);

    const result = firstValueFrom(run('b'));
    TestBed.tick();
    expect(changeSpace).not.toHaveBeenCalled();

    loadedSignal.set(true);
    TestBed.tick();
    expect(await result).toBe(true);
    expect(changeSpace).toHaveBeenCalled();
  });
});

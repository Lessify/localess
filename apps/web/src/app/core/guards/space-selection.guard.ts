import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { SpaceStore } from '@core/stores/space.store';
import { filter, map, take } from 'rxjs';

/**
 * Makes the `:spaceId` in the URL the selected space.
 *
 * The URL and `SpaceStore` both claim to know the current space, and the store's answer comes from
 * localStorage. A link shared from another browser names a space this one never selected, so without
 * this the page would load the URL's document against the stored space's schemas, locales and menus.
 *
 * Unknown ids (deleted, mistyped, from another install, or not visible to this user) fall back to the
 * stored space - but only if that one still exists, or the redirect would land back here forever.
 */
export const spaceSelectionGuard: CanActivateFn = route => {
  const spaceStore = inject(SpaceStore);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const spaceId = route.paramMap.get('spaceId');

  return spaceStore.loaded$.pipe(
    filter(Boolean),
    take(1),
    map(() => {
      const spaces = spaceStore.spaces();
      const space = spaces.find(it => it.id === spaceId);
      if (space) {
        if (spaceStore.selectedSpaceId() !== space.id) {
          spaceStore.changeSpace(space);
        }
        return true;
      }
      notificationService.warning('Space not found', {
        description: 'It may have been deleted, or you do not have access to it.',
      });
      const fallback = spaces.find(it => it.id === spaceStore.selectedSpaceId()) ?? spaces[0];
      return fallback
        ? router.createUrlTree(['/features', 'spaces', fallback.id, 'dashboard'])
        : router.createUrlTree(['/features', 'welcome']);
    }),
  );
};

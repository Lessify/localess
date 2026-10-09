import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

const APPLE_USER_AGENT = /(Mac|iPhone|iPod|iPad)/i;

@Injectable({ providedIn: 'root' })
export class PlatformService {
  readonly platformId = inject(PLATFORM_ID);

  isApple = isPlatformBrowser(this.platformId) ? APPLE_USER_AGENT.test(window.navigator.userAgent) : false;
  funKeyLabel = this.isApple ? '⌘' : 'Ctrl';

  actionSaveLabel = `${this.funKeyLabel} + S`;
  isActionSave(event: KeyboardEvent): boolean {
    return (this.isApple ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 's';
  }

  actionAddLabel = `${this.funKeyLabel} + N`;
  isActionAdd(event: KeyboardEvent): boolean {
    return (this.isApple ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 'n';
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from '@shared/services/notification.service';
import { toast } from 'ngx-sonner';

import { environment } from '../../../environments/environment';

/** Application-wide error handler that adds a UI notification to the error handling
 * provided by the default Angular ErrorHandler.
 */
@Injectable()
export class AppErrorHandler extends ErrorHandler {
  private notificationsService = inject(NotificationService);

  override handleError(error: Error | HttpErrorResponse) {
    if (this.isChunkLoadError(error)) {
      toast.warning('A new version is available', {
        position: 'bottom-left',
        description: 'The app has been updated. Please reload the page to continue.',
        duration: 300000,
        action: {
          label: 'Reload',
          onClick: () => window.location.reload(),
        },
      });
      return;
    }

    let displayMessage = 'An error occurred.';

    if (!environment.production) {
      displayMessage += ' See console for details.';
    }

    this.notificationsService.error(displayMessage);

    super.handleError(error);
  }

  private isChunkLoadError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('Failed to fetch dynamically imported module') || message.includes('error loading dynamically imported module');
  }
}

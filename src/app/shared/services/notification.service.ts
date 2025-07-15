import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { CustomSnackBarComponent } from '@shared/components/custom-snack-bar/custom-snack-bar.component';
import { ActionRoute, CustomSnackBarModel } from '@shared/components/custom-snack-bar/custom-snack-bar.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  default(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 2000,
      panelClass: 'default-notification-overlay',
      data: {
        message: message,
        actions: actions,
      },
    });
  }

  success(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 2000,
      panelClass: 'success-notification-overlay',
      data: {
        message: message,
        actions: actions,
      },
    });
  }

  error(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 6000,
      panelClass: 'error-notification-overlay',
      data: {
        message: message,
        actions: actions,
      },
    });
  }

  private show(configuration: MatSnackBarConfig<CustomSnackBarModel>) {
    this.snackBar.openFromComponent<CustomSnackBarComponent, CustomSnackBarModel>(CustomSnackBarComponent, configuration);
  }
}

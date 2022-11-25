import {Injectable, NgZone} from '@angular/core';
import {MatLegacySnackBar as MatSnackBar, MatLegacySnackBarConfig as MatSnackBarConfig} from '@angular/material/legacy-snack-bar';
import {
  CustomSnackBarComponent
} from '@shared/components/custom-snack-bar/custom-snack-bar.component';
import {
  ActionRoute,
  CustomSnackBarModel
} from '@shared/components/custom-snack-bar/custom-snack-bar.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly zone: NgZone
  ) {
  }

  default(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 2000,
      panelClass: 'default-notification-overlay',
      data: {
        message: message,
        actions: actions
      }
    });
  }

  info(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 2000,
      panelClass: 'info-notification-overlay',
      data: {
        message: message,
        actions: actions
      }
    });
  }

  success(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 2000,
      panelClass: 'success-notification-overlay',
      data: {
        message: message,
        actions: actions
      }
    });
  }

  warn(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 2500,
      panelClass: 'warning-notification-overlay',
      data: {
        message: message,
        actions: actions
      }
    });
  }

  error(message: string, actions?: ActionRoute[]) {
    this.show({
      duration: 6000,
      panelClass: 'error-notification-overlay',
      data: {
        message: message,
        actions: actions
      }
    });
  }

  private show(configuration: MatSnackBarConfig<CustomSnackBarModel>) {
    this.snackBar.openFromComponent<CustomSnackBarComponent, CustomSnackBarModel>(CustomSnackBarComponent, configuration);
  }

  private _show(message: string, configuration: MatSnackBarConfig) {
    // Need to open snackBar from Angular zone to prevent issues with its position per
    // https://stackoverflow.com/questions/50101912/snackbar-position-wrong-when-use-errorhandler-in-angular-5-and-material
    this.zone.run(() => this.snackBar.open(message, undefined, configuration));
  }
}

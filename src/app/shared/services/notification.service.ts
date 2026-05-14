import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ExternalToast, toast } from 'ngx-sonner';

export type ToastAction =
  | { type: 'route'; label: string; link: string }
  | { type: 'link'; label: string; link: string }
  | { type: 'action'; label: string; onClick: () => void };

export type NotificationOptions = Omit<ExternalToast, 'action'> & {
  action?: ToastAction;
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly router = inject(Router);

  default(message: string, options?: NotificationOptions) {
    toast(message, this.toExternalToast(options));
  }

  success(message: string, options?: NotificationOptions) {
    toast.success(message, this.toExternalToast(options));
  }

  info(message: string, options?: NotificationOptions) {
    toast.info(message, this.toExternalToast(options));
  }

  warning(message: string, options?: NotificationOptions) {
    toast.warning(message, this.toExternalToast(options));
  }

  error(message: string, options?: NotificationOptions) {
    toast.error(message, { duration: 6000, ...this.toExternalToast(options) });
  }

  private toExternalToast(options?: NotificationOptions): ExternalToast | undefined {
    if (!options) return undefined;
    const { action, ...rest } = options;
    return { ...rest, action: action ? this.toAction(action) : undefined };
  }

  private toAction(action: ToastAction): ExternalToast['action'] {
    switch (action.type) {
      case 'route':
        return { label: action.label, onClick: () => this.router.navigateByUrl(action.link) };
      case 'link':
        return { label: action.label, onClick: () => window.open(action.link, '_blank') };
      case 'action':
        return { label: action.label, onClick: action.onClick };
    }
  }
}

import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { NotificationService } from '@core/services/notification.service';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { WebhookSecretDialogComponent } from './webhook-secret-dialog.component';

describe('WebhookSecretDialogComponent', () => {
  it('shows the webhook name and secret, and tells when it is copied', () => {
    const success = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { name: 'Site', secret: 'whsec_abc' } },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
        { provide: NotificationService, useValue: { success } },
      ],
    });
    const fixture = TestBed.createComponent(WebhookSecretDialogComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-testid="webhook-secret"]')?.textContent).toBe('whsec_abc');
    expect(element.textContent).toContain('Site');
    fixture.componentInstance.copied();
    expect(success).toHaveBeenCalledWith('Signing secret copied to clipboard.');
  });
});

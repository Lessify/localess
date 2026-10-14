import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification.service';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { TokenSecretDialogComponent, TokenSecretDialogContext } from './token-secret-dialog.component';

describe('TokenSecretDialogComponent', () => {
  const context: TokenSecretDialogContext = {
    name: 'CI',
    token: 'mgt_secretvalue',
    cliLogin: 'localess login --origin https://cms.example --space s1 --token mgt_secretvalue',
  };

  function setup() {
    const success = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
        { provide: NotificationService, useValue: { success } },
      ],
    });
    const fixture = TestBed.createComponent(TokenSecretDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, success };
  }

  it('shows the token, the CLI login command and that it is shown only once', () => {
    const { fixture } = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('mgt_secretvalue');
    expect(text).toContain(context.cliLogin);
    expect(text).toContain("You won't see this token again");
  });

  it("closes only through its own button, labelled \"I've copied it\"", () => {
    const { fixture } = setup();
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].map(it => it.textContent?.trim());

    expect(buttons).toContain("I've copied it");
  });

  it('copied() names what was copied', () => {
    const { component, success } = setup();

    component.copied('CLI login command');

    expect(success).toHaveBeenCalledWith('CLI login command copied to clipboard.');
  });
});

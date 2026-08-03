import { FormControl } from '@angular/forms';

import { WebhookValidator } from './webhook.validator';

describe('WebhookValidator', () => {
  describe('NAME', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', WebhookValidator.NAME).hasError('required')).toBe(true);
    });

    it('is invalid when shorter than 3 characters', () => {
      expect(new FormControl('ab', WebhookValidator.NAME).hasError('minlength')).toBe(true);
    });

    it('is valid for a well-formed name', () => {
      expect(new FormControl('My Webhook', WebhookValidator.NAME).valid).toBe(true);
    });
  });

  describe('URL', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl('', WebhookValidator.URL).hasError('required')).toBe(true);
    });

    it('is invalid when it is not an http(s) url', () => {
      expect(new FormControl('ftp://example.com', WebhookValidator.URL).hasError('pattern')).toBe(true);
    });

    it('is valid for a well-formed https url', () => {
      expect(new FormControl('https://example.com/webhook', WebhookValidator.URL).valid).toBe(true);
    });
  });

  describe('EVENTS', () => {
    it('is invalid when empty (required)', () => {
      expect(new FormControl(null, WebhookValidator.EVENTS).hasError('required')).toBe(true);
    });

    it('is valid when at least one event is set', () => {
      expect(new FormControl(['content.published'], WebhookValidator.EVENTS).valid).toBe(true);
    });
  });
});

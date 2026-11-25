import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CommonValidator } from '@shared/validators/common.validator';

/**
 * Webhooks are delivered only to public https URLs (plain http to a local receiver only where the server
 * allows internal targets). Feedback only: the server applies its delivery rule on save and at delivery.
 */
function webhookUrl(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value == null || value === '') return null; // `required` reports empty values
  if (typeof value !== 'string') return { webhookUrl: true };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { webhookUrl: true };
  }
  if (url.protocol === 'https:') return null;
  if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return null;
  return { webhookUrl: true };
}

export class WebhookValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(50),
  ];

  public static URL: ValidatorFn[] = [Validators.required, Validators.maxLength(2048), webhookUrl];

  public static EVENTS: ValidatorFn[] = [Validators.required, Validators.minLength(1)];

  /** An HTTP header name (a token); which names Localess sets itself the server says on save. */
  public static HEADER_NAME: ValidatorFn = Validators.pattern(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/);

  /** One line, at most 2000 characters. */
  public static HEADER_VALUE: ValidatorFn = control =>
    Validators.maxLength(2000)(control) ?? (/[\r\n]/.test(String(control.value ?? '')) ? { pattern: true } : null);
}

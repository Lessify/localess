import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { CommonValidator } from './common.validator';

/**
 * Whether `url` may be loaded as a visual-editor preview iframe.
 *
 * The preview iframe is trusted with `bypassSecurityTrustResourceUrl`, and the URL comes from the
 * space document, which a space manager can write directly to Firestore. So only an absolute
 * `http:`/`https:` URL on another origin is accepted: a `javascript:` URL would run inside the app,
 * and a same-origin page could lift the iframe sandbox and reach the app's session.
 *
 * @param url - environment URL to check
 * @param appOrigin - origin of the running app; defaults to `window.location.origin`
 */
export function isSafePreviewUrl(url: unknown, appOrigin: string | undefined = globalThis.location?.origin): url is string {
  if (typeof url !== 'string' || url.trim() === '') return false;
  let parsed: URL;
  try {
    // No base URL: relative values throw, which is what rejects them.
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  return !appOrigin || parsed.origin !== appOrigin;
}

function previewUrl(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value == null || value === '') {
    return null; // `required` reports empty values
  }
  return isSafePreviewUrl(value) ? null : { previewUrl: true };
}

export class SpaceValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30),
  ];

  public static ENVIRONMENT_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30),
  ];
  public static ENVIRONMENT_URL: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.minLength(3),
    Validators.maxLength(250),
    previewUrl,
  ];
}

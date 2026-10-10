import { HttpErrorResponse } from '@angular/common/http';

import { TRANSLATE_NOT_CONFIGURED, translateErrorMessage } from './translate-error';

describe('translateErrorMessage', () => {
  it('explains a 412: no translation provider on this environment', () => {
    const error = new HttpErrorResponse({ status: 412, error: { message: 'Machine translation is not configured ...' } });
    expect(translateErrorMessage(error, 'Could not be translated.')).toBe(TRANSLATE_NOT_CONFIGURED);
    expect(TRANSLATE_NOT_CONFIGURED).toContain('Google Translate is not configured on this environment');
  });

  it("uses the server's message for other errors", () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: "Unsupported target locale : 'xx'" } });
    expect(translateErrorMessage(error, 'Could not be translated.')).toBe("Could not be translated: Unsupported target locale : 'xx'");
  });

  it('falls back to the given message', () => {
    expect(translateErrorMessage(new Error('network'), 'Could not be translated.')).toBe('Could not be translated.');
  });
});

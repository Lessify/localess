import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it("appends the server's reason to the action's message", () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: "'blog/home' is already used" } });
    expect(apiErrorMessage(error, 'Document can not be moved.')).toBe("Document can not be moved: 'blog/home' is already used");
  });

  it('keeps the plain message without a server reason', () => {
    expect(apiErrorMessage(new Error('network'), 'Document can not be moved.')).toBe('Document can not be moved.');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 502, error: '<html>' }), 'Document can not be moved.')).toBe(
      'Document can not be moved.',
    );
  });

  it('uses the first message of a validation error list', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: ['slug must be lowercase', 'name is required'] } });
    expect(apiErrorMessage(error, 'Folder can not be created.')).toBe('Folder can not be created: slug must be lowercase');
  });
});

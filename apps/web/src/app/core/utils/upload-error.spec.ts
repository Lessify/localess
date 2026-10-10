import { HttpErrorResponse } from '@angular/common/http';

import { uploadErrorMessage } from './upload-error';

describe('uploadErrorMessage', () => {
  it('says the file is too large on 413, whether our server or a proxy answered', () => {
    expect(uploadErrorMessage('photo.jpg', new HttpErrorResponse({ status: 413, error: '<html>nginx</html>' }))).toBe(
      'photo.jpg could not be uploaded: the file is too large.',
    );
  });

  it("uses the server's message when there is one", () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'Unsupported file type' } });
    expect(uploadErrorMessage('a.exe', error)).toBe('a.exe could not be uploaded: Unsupported file type');
  });

  it('falls back to a plain message', () => {
    expect(uploadErrorMessage('photo.jpg', new Error('network'))).toBe('photo.jpg could not be uploaded.');
    expect(uploadErrorMessage('photo.jpg', new HttpErrorResponse({ status: 500, error: 'oops' }))).toBe('photo.jpg could not be uploaded.');
  });
});

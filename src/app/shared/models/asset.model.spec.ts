import { fileIcon, filePreview } from './asset.model';

describe('fileIcon', () => {
  it('resolves an icon per mime-type prefix', () => {
    expect(fileIcon('audio/mpeg')).toBe('lucideFileMusic');
    expect(fileIcon('text/plain')).toBe('lucideFileText');
    expect(fileIcon('image/png')).toBe('lucideFileImage');
    expect(fileIcon('video/mp4')).toBe('lucideFileVideoCamera');
    expect(fileIcon('application/pdf')).toBe('lucideFileDigit');
  });

  it('falls back to the generic file icon for unknown types', () => {
    expect(fileIcon('unknown/type')).toBe('lucideFile');
  });
});

describe('filePreview', () => {
  it('is true for image and video types', () => {
    expect(filePreview('image/png')).toBe(true);
    expect(filePreview('video/mp4')).toBe(true);
  });

  it('is false for other types', () => {
    expect(filePreview('application/pdf')).toBe(false);
    expect(filePreview('audio/mpeg')).toBe(false);
  });
});

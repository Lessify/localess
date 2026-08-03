import { FormatFileSizePipe } from './digital-store.pipe';

describe('FormatFileSizePipe', () => {
  const pipe = new FormatFileSizePipe();

  it('returns an empty string when bytes is undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('formats 0 bytes as bytes', () => {
    expect(pipe.transform(0)).toBe('0.00 B');
  });

  it('formats a value below 1024 as bytes', () => {
    expect(pipe.transform(500)).toBe('500.00 B');
  });

  it('formats exactly 1024 bytes as 1.00 KB', () => {
    expect(pipe.transform(1024)).toBe('1.00 KB');
  });

  it('formats a fractional KB value', () => {
    expect(pipe.transform(1500)).toBe('1.46 KB');
  });

  it('formats exactly 1024 * 1024 bytes as 1.00 MB', () => {
    expect(pipe.transform(1024 * 1024)).toBe('1.00 MB');
  });

  it('formats a large GB value', () => {
    expect(pipe.transform(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB');
  });
});

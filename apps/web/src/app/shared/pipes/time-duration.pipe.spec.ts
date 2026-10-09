import { TimeDurationPipe } from './time-duration.pipe';

describe('TimeDurationPipe', () => {
  const pipe = new TimeDurationPipe();

  it('returns "0s" when duration is undefined', () => {
    expect(pipe.transform(undefined)).toBe('0s');
  });

  it('returns a string value unchanged, regardless of unit', () => {
    expect(pipe.transform('N/A')).toBe('N/A');
  });

  it('formats sub-second ms values with a trailing "ms"', () => {
    expect(pipe.transform(500, 'ms')).toBe('500ms');
  });

  it('converts ms values of 1000 or more into seconds/minutes/hours', () => {
    expect(pipe.transform(1500, 'ms')).toBe('1s');
  });

  it('formats seconds under a minute as "Ns"', () => {
    expect(pipe.transform(30)).toBe('30s');
  });

  it('formats seconds with minutes as "Nm Ns"', () => {
    expect(pipe.transform(65)).toBe('1m 5s');
  });

  it('formats seconds with hours as "Nh Nm Ns"', () => {
    expect(pipe.transform(3725)).toBe('1h 2m 5s');
  });

  it('defaults the unit to seconds when not specified', () => {
    expect(pipe.transform(90)).toBe('1m 30s');
  });
});

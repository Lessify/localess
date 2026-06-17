import { Pipe, PipeTransform } from '@angular/core';

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export type TimeDurationUnit = 'ms' | 's';

@Pipe({
  name: 'timeDuration',
  standalone: true,
})
export class TimeDurationPipe implements PipeTransform {
  transform(duration?: number | string, unit: TimeDurationUnit = 's'): string {
    if (duration == undefined) {
      return '0s';
    }
    if (typeof duration === 'string') {
      return duration;
    }
    if (unit === 'ms') {
      if (duration < 1000) {
        return `${Math.trunc(duration)}ms`;
      }
      return this.format(duration / 1000);
    }
    return this.format(duration);
  }

  private format(seconds: number): string {
    const hours = Math.trunc(seconds / HOUR);
    const minutes = Math.trunc((seconds / MINUTE) % 60);
    const secs = Math.trunc(seconds % 60);
    if (hours === 0) {
      if (minutes === 0) {
        return `${secs}s`;
      }
      return `${minutes}m ${secs}s`;
    }
    return `${hours}h ${minutes}m ${secs}s`;
  }
}

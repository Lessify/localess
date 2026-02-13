import { Pipe, PipeTransform } from '@angular/core';

const MINUTE = 60;
const HOUR = 60 * MINUTE;

@Pipe({
  name: 'timeDuration',
  standalone: true,
})
export class TimeDurationPipe implements PipeTransform {
  transform(duration?: number | string): string {
    if (duration != undefined) {
      if (typeof duration === 'number') {
        const hours = Math.trunc(duration / HOUR);
        const minutes = Math.trunc((duration / MINUTE) % 60);
        const seconds = Math.trunc(duration % 60);
        if (hours === 0) {
          if (minutes === 0) {
            return `${seconds}s`;
          }
          return `${minutes}m ${seconds}s`;
        }
        return `${hours}h ${minutes}m ${seconds}s`;
      } else {
        return duration;
      }
    }
    return '';
  }
}

import { Pipe, PipeTransform } from '@angular/core';

const K = 1000;
const M = K * 1000;
const G = M * 1000;

@Pipe({ name: 'digitalStore' })
export class DigitalStorePipe implements PipeTransform {
  transform(size?: number): string {
    if (size != undefined) {
      switch (size.toFixed().length) {
        case 1:
        case 2:
        case 3:
          return `${size} B`;
        case 4:
        case 5:
        case 6:
          return `${(size / K).toFixed(2)} KB`;
        case 7:
        case 8:
        case 9:
          return `${(size / M).toFixed(2)} MB`;
        case 10:
        case 11:
        case 12:
          return `${(size / G).toFixed(2)} GB`;
        default:
          return `${size} B`;
      }
    }
    return '';
  }
}

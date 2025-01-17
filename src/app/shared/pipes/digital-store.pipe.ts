import { Pipe, PipeTransform } from '@angular/core';

const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

@Pipe({ name: 'formatFileSize' })
export class FormatFileSizePipe implements PipeTransform {
  transform(bytes?: number): string {
    if (bytes != undefined) {
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    return '';
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { Translation } from '../models/translation.model';

@Pipe({ name: 'translationFilter' })
export class TranslationFilterPipe implements PipeTransform {
  transform(items: Translation[], filter: string, locale: string, labels: string[]): Translation[] {
    if (!items || (!filter && !labels.length)) {
      return items;
    }
    return items.filter(it => {
      const matchByLabel = !labels.length || (it.labels && it.labels.length > 0 && labels.every(label => it.labels?.includes(label)));
      if (it.id.indexOf(filter) !== -1 && matchByLabel) {
        return true;
      } else {
        if (it.locales[locale]) {
          return it.locales[locale].indexOf(filter) !== -1 && matchByLabel;
        }
        return false;
      }
    });
  }
}

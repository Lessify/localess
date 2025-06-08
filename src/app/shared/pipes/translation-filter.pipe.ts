import { Pipe, PipeTransform } from '@angular/core';
import { Translation } from '../models/translation.model';

@Pipe({
  name: 'translationFilter',
  standalone: true,
})
export class TranslationFilterPipe implements PipeTransform {
  transform(items: Translation[], filter: string, locale: string, labels: string[]): Translation[] {
    const lcFilter = filter.toLowerCase();
    if (!items || (!filter && !labels.length)) {
      return items;
    }
    return items.filter(it => {
      const matchByLabel = !labels.length || (it.labels && it.labels.length > 0 && labels.every(label => it.labels?.includes(label)));
      if (it.id.toLowerCase().indexOf(lcFilter) !== -1 && matchByLabel) {
        return true;
      } else {
        if (it.locales[locale]) {
          return it.locales[locale].indexOf(lcFilter) !== -1 && matchByLabel;
        }
        return false;
      }
    });
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import {Translation} from '../models/translation.model';

@Pipe({ name: 'translationFilter' })
export class TranslationFilterPipe implements PipeTransform {
  transform(
    items: Translation[],
    filter: string,
    locale: string,
    labels: string[]
  ): Translation[] {
    console.log(`[TranslationFilterPipe] ${Date.now()}`)
    if (!items || (!filter && !labels.length)) {
      return items;
    }
    return items.filter(it => {
      const matchByLabel: boolean =
        !labels.length ||
        (it.labels.length > 0 &&
          labels.every(label => it.labels.includes(label)));
      if (it.name.indexOf(filter) !== -1 && matchByLabel) {
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

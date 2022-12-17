import {Injectable} from '@angular/core';
import {Schematic} from '@shared/models/schematic.model';

@Injectable()
export class ContentService {
  constructor() {
  }

  extractLocaleContent(content: any, schematic: Schematic, locale: string): Record<string, any> {
    const result: Record<string, any> = {}
    schematic.components?.forEach((comp) => {
      let value;
      if (comp.translatable) {
        // Extract Locale specific values
        value = content[`${comp.name}_i18n_${locale}`]
      } else {
        // Extract not translatable values in fallback locale
        value = content[comp.name]
      }
      if (value) {
        result[comp.name] = value;
      }
    })

    return result
  }
}

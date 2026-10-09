import { LlTreeNode } from '@shared/components/tree/tree.imports';
import { Locale } from '@shared/models/locale.model';
import { LocaleStatus, Translation, TranslationStatus } from '@shared/models/translation.model';

export interface TranslationNode extends LlTreeNode {
  children?: TranslationNode[];
}

export function identifyTranslationStatus(translate: Translation, locales: Locale[]): TranslationStatus {
  if (Object.getOwnPropertyNames(translate.locales).length === 0) return TranslationStatus.UNTRANSLATED;
  let translateCount = 0;
  for (const locale of locales) {
    if (locale.id in translate.locales && translate.locales[locale.id] !== '') {
      translateCount++;
    }
  }
  if (locales.length === translateCount) {
    return TranslationStatus.TRANSLATED;
  }
  if (translateCount === 0) {
    return TranslationStatus.UNTRANSLATED;
  }
  return TranslationStatus.PARTIALLY_TRANSLATED;
}

export function identifyLocaleStatus(translate: Translation, locale: string): LocaleStatus {
  const localeValue = translate.locales[locale];
  if (localeValue === undefined || localeValue.trim() === '') {
    return LocaleStatus.UNTRANSLATED;
  }
  return LocaleStatus.TRANSLATED;
}

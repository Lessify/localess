import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatTreeModule } from '@angular/material/tree';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronRight } from '@ng-icons/lucide';
import { Locale } from '@shared/models/locale.model';
import { isLocaleStatus, isTranslationStatus, LocaleStatus, Translation, TranslationStatus } from '@shared/models/translation.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

import { identifyLocaleStatus, identifyTranslationStatus, TranslationNode } from '../../models/translation.model';
import { TranslationFilterCriteria } from '../translation-filter/translation-filter.component';
import { TranslationStatusComponent } from '../translation-status/translation-status.component';
import { TranslationStringViewComponent } from '../translation-string-view/translation-string-view.component';

@Component({
  selector: 'll-translation-list',
  templateUrl: './translation-list.component.html',
  styleUrls: ['./translation-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ScrollingModule,
    MatTreeModule,
    TranslationStatusComponent,
    TranslationStringViewComponent,
    HlmButtonImports,
    HlmIconImports,
    HlmItemImports,
    HlmSpinnerImports,
  ],
  providers: [
    provideIcons({
      lucideChevronRight,
      lucideChevronDown,
    }),
  ],
})
export class TranslationListComponent {
  readonly settingsStore = inject(LocalSettingsStore);

  // Inputs
  readonly translations = input.required<Translation[]>();
  readonly availableLocales = input.required<Locale[]>();
  readonly currentLocale = input('');
  readonly filterCriteria = input<TranslationFilterCriteria | undefined>(undefined);
  readonly selectedId = input<string | undefined>(undefined);
  readonly isLocaleUpdateLoading = input(false);
  readonly translationUpdateId = input<string | undefined>(undefined);

  // Outputs
  readonly translationSelect = output<Translation>();

  readonly translationsFiltered = computed(() => {
    const criteria = this.filterCriteria();
    return this.filterTranslations(
      this.translations(),
      criteria?.locale || 'en',
      criteria?.search || '',
      criteria?.labels || [],
      criteria?.states?.filter(it => isTranslationStatus(it)) || [],
      criteria?.states?.filter(it => isLocaleStatus(it)) || [],
    );
  });
  readonly translationTreeFiltered = computed(() => this.buildTranslationTree(this.translationsFiltered()));
  readonly translationMap = computed(() => new Map<string, Translation>(this.translations().map(it => [it.id, it])));

  // Tree features
  readonly childrenAccessor = (node: TranslationNode) => node.children ?? [];
  readonly hasChild = (_: number, node: TranslationNode) => !!node.children && node.children.length > 0;
  readonly trackBy = (_: number, node: TranslationNode) => this.expansionKey(node);
  readonly expansionKey = (node: TranslationNode) => node.key;

  identifyTranslationStatus(translate: Translation): TranslationStatus {
    return identifyTranslationStatus(translate, this.availableLocales());
  }

  identifyLocaleStatus(translate: Translation, locale: string): LocaleStatus {
    return identifyLocaleStatus(translate, locale);
  }

  filterTranslations(
    items: Translation[],
    locale: string,
    search: string,
    labels: string[],
    translationStates: TranslationStatus[],
    localeStates: LocaleStatus[],
  ): Translation[] {
    const lcFilter = search.trim().toLowerCase();
    if (!items || (!search && !labels.length && !translationStates.length && !localeStates.length)) {
      return items;
    }
    return items.filter(it => {
      const matchByLabel = !labels.length || (it.labels && it.labels.length > 0 && labels.some(label => it.labels?.includes(label)));
      const matchByTranslationStatus =
        !translationStates.length || translationStates.includes(identifyTranslationStatus(it, this.availableLocales()));
      const matchByLocaleStatus = !localeStates.length || localeStates.includes(identifyLocaleStatus(it, locale));
      if (!matchByTranslationStatus) return false;
      if (!matchByLocaleStatus) return false;
      if (it.id.toLowerCase().includes(lcFilter) && matchByLabel) {
        return true;
      } else {
        const localeValue = it.locales[locale];
        if (localeValue) {
          return localeValue.toLowerCase().includes(lcFilter) && matchByLabel;
        }
        return false;
      }
    });
  }

  buildTranslationTree(translations: Translation[]): TranslationNode[] {
    const tTree: Record<string, any> = {};
    for (const translation of translations) {
      const keys = translation.id.split('.');
      let currentNode = tTree;
      for (const key of keys) {
        if (!currentNode[key]) {
          currentNode[key] = {};
        }
        currentNode = currentNode[key];
      }
    }

    function convertTree(node: Record<string, any>, prefix?: string): TranslationNode[] {
      return Object.entries(node).map(([key, value]) => ({
        name: key,
        key: prefix ? `${prefix}.${key}` : key,
        ...(Object.keys(value).length > 0 && { children: convertTree(value, prefix ? `${prefix}.${key}` : key) }),
      }));
    }

    return convertTree(tTree);
  }
}

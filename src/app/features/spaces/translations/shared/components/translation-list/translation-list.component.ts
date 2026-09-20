import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { collectGroupKeys, LlTreeImports } from '@shared/components/tree/tree.imports';
import { Locale } from '@shared/models/locale.model';
import { isLocaleStatus, isTranslationStatus, LocaleStatus, Translation, TranslationStatus } from '@shared/models/translation.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
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
    LlTreeImports,
    TranslationStatusComponent,
    TranslationStringViewComponent,
    HlmItemImports,
    HlmSpinnerImports,
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

  /** True when any filter narrows the list — search text, labels or states. */
  readonly isFiltering = computed(() => {
    const criteria = this.filterCriteria();
    return !!(criteria?.search || criteria?.labels?.length || criteria?.states?.length);
  });

  /** Expansion the user chose by hand while browsing unfiltered. */
  private readonly manualExpandedKeys = signal<ReadonlySet<string>>(new Set<string>());

  /**
   * Expansion the user chose by hand *during* the current filter. Reset to `null`
   * whenever the criteria change, so each new filter starts fully expanded again.
   */
  private readonly filterExpandedKeys = linkedSignal<TranslationFilterCriteria | undefined, ReadonlySet<string> | null>({
    source: this.filterCriteria,
    computation: () => null,
  });

  /**
   * While a filter is active the tree opens fully, so no match can hide behind a
   * collapsed parent; the manual state is restored once the filter clears.
   */
  readonly expandedKeys = computed<ReadonlySet<string>>(() => {
    if (!this.isFiltering()) {
      return this.manualExpandedKeys();
    }
    return this.filterExpandedKeys() ?? collectGroupKeys(this.translationTreeFiltered());
  });

  onExpandedKeysChange(keys: ReadonlySet<string>): void {
    if (this.isFiltering()) {
      this.filterExpandedKeys.set(keys);
    } else {
      this.manualExpandedKeys.set(keys);
    }
  }

  onNodeSelect(node: TranslationNode): void {
    const translation = this.translationMap().get(node.key);
    if (translation) {
      this.translationSelect.emit(translation);
    }
  }

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

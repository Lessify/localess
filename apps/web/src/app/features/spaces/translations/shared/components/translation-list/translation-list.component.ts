import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ChangeEventsService } from '@core/api/change-events.service';
import { NotificationService } from '@core/services/notification.service';
import { TranslationService } from '@core/services/translation.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { PagedList } from '@core/utils/paged-list';
import { Locale, Translation } from '@localess/shared';
import { LlPaginatorImports } from '@shared/components/paginator/paginator.imports';
import { LlTreeImports } from '@shared/components/tree/tree.imports';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { combineLatest, EMPTY } from 'rxjs';
import { catchError, debounceTime, filter, switchMap } from 'rxjs/operators';

import { identifyTranslationStatus } from '../../models/translation.model';
import { isLocaleStatus, isTranslationStatus, LocaleStatus, TranslationStatus } from '../../models/translation-status.model';
import { isFiltering, TranslationFilterParams, TranslationTree, TranslationTreeRow } from '../../models/translation-tree';
import { TranslationFilterCriteria } from '../translation-filter/translation-filter.component';
import { TranslationStatusComponent } from '../translation-status/translation-status.component';
import { TranslationStringViewComponent } from '../translation-string-view/translation-string-view.component';

/** The filter's statuses as the server names them (`?status=`, `?localeStatus=`). */
const STATUS_PARAM: Record<TranslationStatus, string> = {
  [TranslationStatus.TRANSLATED]: 'TRANSLATED',
  [TranslationStatus.PARTIALLY_TRANSLATED]: 'PARTIALLY_TRANSLATED',
  [TranslationStatus.UNTRANSLATED]: 'UNTRANSLATED',
};
const LOCALE_STATUS_PARAM: Record<LocaleStatus, string> = {
  [LocaleStatus.TRANSLATED]: 'TRANSLATED',
  [LocaleStatus.UNTRANSLATED]: 'UNTRANSLATED',
};

/**
 * The keys of the Translations page, from the server: the list view one page at a time (`GET …/translations`), the
 * tree view one level at a time (`TranslationTree`). Both send the same filter; both read again after a change.
 */
@Component({
  selector: 'll-translation-list',
  templateUrl: './translation-list.component.html',
  styleUrls: ['./translation-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ScrollingModule,
    LlTreeImports,
    LlPaginatorImports,
    TranslationStatusComponent,
    TranslationStringViewComponent,
    HlmItemImports,
    HlmSpinnerImports,
  ],
})
export class TranslationListComponent {
  readonly settingsStore = inject(LocalSettingsStore);
  private readonly translationService = inject(TranslationService);
  private readonly notificationService = inject(NotificationService);
  private readonly events = inject(ChangeEventsService);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  readonly spaceId = input.required<string>();
  readonly availableLocales = input.required<Locale[]>();
  readonly currentLocale = input('');
  readonly filterCriteria = input<TranslationFilterCriteria | undefined>(undefined);
  readonly selectedId = input<string | undefined>(undefined);
  readonly isLocaleUpdateLoading = input(false);
  readonly translationUpdateId = input<string | undefined>(undefined);

  // Outputs
  readonly translationSelect = output<Translation>();
  /** The first key shown after a load (the page selects it when nothing is selected yet). */
  readonly firstTranslation = output<Translation>();

  /** The filter both views send. */
  readonly filterParams = computed<TranslationFilterParams>(() => {
    const criteria = this.filterCriteria();
    const states = criteria?.states ?? [];
    return {
      locale: this.currentLocale() || undefined,
      search: criteria?.search?.trim() || undefined,
      label: criteria?.labels?.length ? criteria.labels : undefined,
      status: states.filter(isTranslationStatus).map(it => STATUS_PARAM[it]),
      localeStatus: states.filter(isLocaleStatus).map(it => LOCALE_STATUS_PARAM[it]),
    };
  });
  readonly isFiltering = computed(() => isFiltering(this.filterParams()));

  // List view: one page from the server.
  readonly list = new PagedList(50);
  readonly listItems = signal<Translation[]>([]);
  readonly listTotal = signal(0);
  readonly listLoading = signal(true);
  private readonly listViewport = viewChild(CdkVirtualScrollViewport);
  /** The query of the page shown: another page or filter starts at the top; a live refresh keeps the position. */
  private shownQuery = '';

  // Tree view: one level at a time.
  readonly tree = new TranslationTree(this.translationService);

  /** The tree's key of the selected translation (the tree tracks nodes by key, the page by id). */
  readonly selectedKey = signal<string | undefined>(undefined);

  constructor() {
    // The list: a new filter starts from the first page.
    effect(() => {
      const params = this.filterParams();
      untracked(() => this.list.setFilters(params));
    });
    combineLatest([toObservable(this.spaceId), toObservable(this.list.params), toObservable(this.settingsStore.translationLayout)])
      .pipe(
        // Only while the list is shown: the tree reads its own levels.
        switchMap(([spaceId, params, layout]) =>
          layout !== 'list'
            ? EMPTY
            : this.translationService.findAll(spaceId, params).pipe(
                catchError(() => {
                  this.notificationService.error('Translations can not be loaded.');
                  this.listLoading.set(false);
                  return EMPTY;
                }),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        const query = this.list.params().toString();
        if (query !== this.shownQuery) this.listViewport()?.scrollToIndex(0);
        this.shownQuery = query;
        this.listItems.set(page.items);
        this.listTotal.set(page.total);
        this.list.onLoaded(page);
        this.listLoading.set(false);
        if (page.items[0]) this.firstTranslation.emit(page.items[0]);
      });

    // The tree: the top level again for a new space, filter or layout; the shown levels again after a change.
    effect(() => {
      const spaceId = this.spaceId();
      const params = this.filterParams();
      if (this.settingsStore.translationLayout() !== 'tree') return;
      untracked(() => void this.loadTree(spaceId, params));
    });
    toObservable(this.spaceId)
      .pipe(
        switchMap(spaceId => this.events.changes(spaceId)),
        filter(event => event.entity === 'translations' && this.settingsStore.translationLayout() === 'tree'),
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => void this.tree.refresh().catch(() => this.notificationService.error('Translations can not be loaded.')));
  }

  onExpandedKeysChange(keys: ReadonlySet<string>): void {
    void this.tree.setExpanded(keys).catch(() => this.notificationService.error('Translations can not be loaded.'));
  }

  onNodeSelect(row: TranslationTreeRow): void {
    if (row.kind === 'more') {
      void this.tree.loadMore(row.parent ?? '').catch(() => this.notificationService.error('Translations can not be loaded.'));
      return;
    }
    if (row.translation) {
      this.selectedKey.set(row.translation.key);
      this.translationSelect.emit(row.translation);
    }
  }

  onListSelect(translation: Translation): void {
    this.selectedKey.set(translation.key);
    this.translationSelect.emit(translation);
  }

  identifyTranslationStatus(translation: Translation): TranslationStatus {
    return identifyTranslationStatus(translation, this.availableLocales());
  }

  private async loadTree(spaceId: string, params: TranslationFilterParams): Promise<void> {
    try {
      await this.tree.load(spaceId, params);
      const first = firstKey(this.tree.rows());
      if (first) this.firstTranslation.emit(first);
    } catch {
      this.notificationService.error('Translations can not be loaded.');
    }
  }
}

/** The first translation of the tree, in the order shown. */
function firstKey(rows: readonly TranslationTreeRow[]): Translation | undefined {
  for (const row of rows) {
    if (row.translation) return row.translation;
    const below = row.children && firstKey(row.children);
    if (below) return below;
  }
  return undefined;
}

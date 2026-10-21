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
import { Locale, Translation } from '@localess/shared';
import { LlTreeImports } from '@shared/components/tree/tree.imports';
import { InViewDirective } from '@shared/directives/in-view.directive';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { debounceTime, filter, switchMap } from 'rxjs/operators';

import { identifyTranslationStatus } from '../../models/translation.model';
import { TranslationPages } from '../../models/translation-pages';
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

/** A row of the virtual list: a key, or the marker at its end that loads the next keys when it comes into view. */
export type ListRow = { kind: 'key'; translation: Translation } | { kind: 'end' };
const LIST_END: ListRow = { kind: 'end' };
/** The end marker's track id: never a translation id. */
const LIST_END_ID = '\u0000end';

/**
 * The keys of the Translations page, from the server: the list view as the user scrolls (`TranslationPages`), the tree
 * view one level at a time (`TranslationTree`). Both send the same filter; both read again what they show after a change.
 */
@Component({
  selector: 'll-translation-list',
  templateUrl: './translation-list.component.html',
  styleUrls: ['./translation-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A column of the page: the list (or tree) takes its height, the count line the rest.
  host: { class: 'flex min-h-0 flex-col' },
  imports: [
    ScrollingModule,
    LlTreeImports,
    InViewDirective,
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

  // List view: read as the user scrolls.
  readonly pages = new TranslationPages(this.translationService);
  /** The rows of the virtual list: the keys, then a marker while the server has more (it loads them when in view). */
  readonly listRows = computed<ListRow[]>(() => {
    const rows: ListRow[] = this.pages.items().map(translation => ({ kind: 'key', translation }));
    return this.pages.hasMore() ? [...rows, LIST_END] : rows;
  });
  /** The height of a list row and of the end marker, in px (`h-16`): a fixed-size virtual list needs one height. */
  readonly rowHeight = 64;
  readonly trackListRow = (_: number, row: ListRow): string => (row.kind === 'end' ? LIST_END_ID : row.translation.id);
  private readonly listViewport = viewChild(CdkVirtualScrollViewport);
  /** Whether the end marker reported itself on screen (it says nothing when the virtual list drops it). */
  private readonly listEndSeen = signal(false);
  /** The end of the virtual list's rendered range: the marker exists only while it is within it. */
  private readonly listRenderedEnd = signal(0);
  /** The end marker is rendered and on screen: more keys load while it is. */
  private readonly listEndInView = computed(
    () => this.listEndSeen() && this.pages.hasMore() && this.listRenderedEnd() >= this.listRows().length,
  );

  // Tree view: one level at a time.
  readonly tree = new TranslationTree(this.translationService);
  /** The levels whose "Load more" row is on screen: their next nodes load while it is. */
  private readonly treeMoreInView = signal<ReadonlySet<string>>(new Set<string>());

  /** The tree's key of the selected translation (the tree tracks nodes by key, the page by id). */
  readonly selectedKey = signal<string | undefined>(undefined);

  constructor() {
    // A new space, filter or layout: the shown view from its start.
    effect(() => {
      const spaceId = this.spaceId();
      const params = this.filterParams();
      const layout = this.settingsStore.translationLayout();
      untracked(() => void (layout === 'tree' ? this.loadTree(spaceId, params) : this.loadList(spaceId, params)));
    });
    // The end of the list (or a level of the tree) on screen: its next keys. Runs again when a read ends, so a
    // marker still showing after a short page loads the next one too.
    // The virtual list's rendered range (the viewport is there only in the list layout).
    effect(onCleanup => {
      const viewport = this.listViewport();
      if (!viewport) return;
      const subscription = viewport.renderedRangeStream.subscribe(range => this.onListRendered(range.end));
      onCleanup(() => subscription.unsubscribe());
    });
    effect(() => {
      if (this.settingsStore.translationLayout() !== 'list') return;
      if (this.listEndInView() && this.pages.hasMore() && !this.pages.loading()) untracked(() => this.loadMoreList());
    });
    effect(() => {
      if (this.settingsStore.translationLayout() !== 'tree') return;
      const loading = this.tree.loadingMore();
      // Only a row still shown counts: one in a group closed meanwhile said nothing when it went.
      const shown = shownMoreRows(this.tree.rows(), this.tree.expandedKeys());
      for (const parent of this.treeMoreInView()) {
        if (!shown.has(parent)) continue;
        if (!loading.has(parent)) untracked(() => this.loadMoreTree(parent));
      }
    });
    // A change (here or by someone else): what is shown is read again, in place.
    toObservable(this.spaceId)
      .pipe(
        switchMap(spaceId => this.events.changes(spaceId)),
        filter(event => event.entity === 'translations'),
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const refresh = this.settingsStore.translationLayout() === 'tree' ? this.tree.refresh() : this.pages.refresh();
        void refresh.catch(() => this.notificationService.error('Translations can not be loaded.'));
      });
  }

  /** The virtual list rendered its rows up to `end` (exclusive): the marker is there when `end` reaches it. */
  onListRendered(end: number): void {
    this.listRenderedEnd.set(end);
  }

  onListEndInView(inView: boolean): void {
    this.listEndSeen.set(inView);
  }

  onTreeMoreInView(parent: string, inView: boolean): void {
    this.treeMoreInView.update(it => {
      const next = new Set(it);
      if (inView) next.add(parent);
      else next.delete(parent);
      return next;
    });
  }

  onExpandedKeysChange(keys: ReadonlySet<string>): void {
    void this.tree.setExpanded(keys).catch(() => this.notificationService.error('Translations can not be loaded.'));
  }

  onNodeSelect(row: TranslationTreeRow): void {
    if (row.kind === 'more') {
      this.loadMoreTree(row.parent ?? '');
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

  private async loadList(spaceId: string, params: TranslationFilterParams): Promise<void> {
    // A new filter starts at the top; the marker's state is the old list's.
    this.listEndSeen.set(false);
    this.listViewport()?.scrollToIndex(0);
    try {
      await this.pages.load(spaceId, params);
      const first = this.pages.items()[0];
      if (first) this.firstTranslation.emit(first);
    } catch {
      this.notificationService.error('Translations can not be loaded.');
    }
  }

  private loadMoreList(): void {
    void this.pages.loadMore().catch(() => {
      // The marker stays on screen: wait until it scrolls back into view instead of asking again at once.
      this.listEndSeen.set(false);
      this.notificationService.error('Translations can not be loaded.');
    });
  }

  private loadMoreTree(parent: string): void {
    void this.tree.loadMore(parent).catch(() => {
      this.onTreeMoreInView(parent, false);
      this.notificationService.error('Translations can not be loaded.');
    });
  }

  private async loadTree(spaceId: string, params: TranslationFilterParams): Promise<void> {
    this.treeMoreInView.set(new Set<string>());
    try {
      await this.tree.load(spaceId, params);
      const first = firstKey(this.tree.rows());
      if (first) this.firstTranslation.emit(first);
    } catch {
      this.notificationService.error('Translations can not be loaded.');
    }
  }
}

/** The levels whose "Load more" row is shown: in the top level or in an open group. */
function shownMoreRows(rows: readonly TranslationTreeRow[], expanded: ReadonlySet<string>): Set<string> {
  const shown = new Set<string>();
  const visit = (items: readonly TranslationTreeRow[]) => {
    for (const row of items) {
      if (row.kind === 'more') shown.add(row.parent ?? '');
      else if (row.children && expanded.has(row.key)) visit(row.children);
    }
  };
  visit(rows);
  return shown;
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

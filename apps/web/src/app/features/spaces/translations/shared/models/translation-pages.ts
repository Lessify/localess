import { HttpParams } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { TranslationService } from '@core/services/translation.service';
import { Page, Translation } from '@localess/shared';
import { firstValueFrom } from 'rxjs';

import { TranslationFilterParams } from './translation-tree';

/** Keys read per request: the first ones, and each time the end of the list scrolls into view. */
export const LIST_PAGE_SIZE = 50;

/**
 * The list view of the Translations page, read from the server as the user scrolls (`GET …/translations`): the first
 * `LIST_PAGE_SIZE` keys, then the next ones each time the end of the list comes into view (`loadMore`). A change reads
 * again what is loaded (`refresh`), so the list keeps its length and the user's scroll position.
 */
export class TranslationPages {
  readonly items = signal<Translation[]>([]);
  /** How many keys match: the count shown under the list. */
  readonly total = signal(0);
  readonly loading = signal(false);
  /** Whether the server has keys the list doesn't show yet. */
  readonly hasMore = computed(() => this.items().length < this.total());

  /** Pages read so far: the next one is `pages`. */
  private pages = 0;
  private spaceId = '';
  private filter: TranslationFilterParams = {};
  /** Drops the answers of a read a newer one replaced. */
  private generation = 0;

  constructor(private readonly translationService: TranslationService) {}

  /** A new space or filter: the first keys again. */
  async load(spaceId: string, filter: TranslationFilterParams): Promise<void> {
    this.spaceId = spaceId;
    this.filter = filter;
    const generation = ++this.generation;
    this.loading.set(true);
    try {
      const page = await this.read(0);
      if (generation !== this.generation) return;
      this.pages = 1;
      this.items.set(page.items);
      this.total.set(page.total);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  /** The next keys, appended (nothing while a read is running or when every key is shown). */
  async loadMore(): Promise<void> {
    if (!this.spaceId || this.loading() || !this.hasMore()) return;
    const generation = this.generation;
    this.loading.set(true);
    try {
      const page = await this.read(this.pages);
      if (generation !== this.generation) return;
      this.pages++;
      // A key added meanwhile shifts the pages by one: a key already shown is not shown twice.
      const shown = new Set(this.items().map(it => it.id));
      this.items.set([...this.items(), ...page.items.filter(it => !shown.has(it.id))]);
      this.total.set(page.total);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  /** After a change: the pages loaded, read again (a key added or removed meanwhile shows in place). */
  async refresh(): Promise<void> {
    if (!this.spaceId) return;
    const generation = ++this.generation;
    try {
      const read = await Promise.all(Array.from({ length: Math.max(this.pages, 1) }, (_, page) => this.read(page)));
      if (generation !== this.generation) return;
      const seen = new Set<string>();
      this.items.set(read.flatMap(page => page.items).filter(it => !seen.has(it.id) && !!seen.add(it.id)));
      this.total.set(read.at(-1)?.total ?? 0);
    } finally {
      // A refresh replaces a read that was running: the list isn't loading any more once it answers.
      if (generation === this.generation) this.loading.set(false);
    }
  }

  private read(page: number): Promise<Page<Translation>> {
    return firstValueFrom(this.translationService.findAll(this.spaceId, filterHttpParams(this.filter, page, LIST_PAGE_SIZE)));
  }
}

/** A page of `GET …/translations` with the filter: a list's `status=A&status=B`, a value once, an empty one left out. */
export function filterHttpParams(filter: TranslationFilterParams, page: number, size: number): HttpParams {
  let params = new HttpParams().set('page', page).set('size', size);
  for (const [name, value] of Object.entries(filter)) {
    if (Array.isArray(value)) for (const it of value) params = params.append(name, it);
    else if (value) params = params.set(name, value);
  }
  return params;
}

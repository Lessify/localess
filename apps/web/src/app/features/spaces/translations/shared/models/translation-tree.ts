import { HttpParams } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { TranslationService } from '@core/services/translation.service';
import { Page, Translation, TranslationNode } from '@localess/shared';
import { LlTreeNode } from '@shared/components/tree/tree.imports';
import { firstValueFrom } from 'rxjs';

/** At most this many matches open the whole filtered tree at once; more stay collapsed, with their counts. */
export const TREE_EXPAND_ALL_MAX = 200;
/** Nodes read per level request ("Load more" reads the next ones). */
const LEVEL_SIZE = 100;
/** Separates a placeholder row's key from the path it belongs to; never part of a translation key. */
const PLACEHOLDER = '\u0000';

/** A row of `ll-tree`: a node of the key tree, or one of the two placeholder rows. */
export interface TranslationTreeRow extends LlTreeNode {
  kind: 'node' | 'loading' | 'more';
  /** The translation whose key is this path (a node can be a key and a group at once). */
  translation?: Translation;
  /** Matching keys below: shown next to a group's name. */
  count: number;
  /** The level a "Load more" row loads more of (`''`: the top level). */
  parent?: string;
  children?: TranslationTreeRow[];
}

/** The filter both views send, as query parameters (no paging). */
export type TranslationFilterParams = Record<string, string | string[] | undefined>;

interface Level {
  nodes: TranslationNode[];
  total: number;
  pages: number;
}

/**
 * The tree of the Translations page, read from the server one level at a time (`GET …/translations/nodes`): a level is
 * read when its group is first opened, "Load more" reads its next nodes, and every open level is read again after a
 * change. With a filter, at most `TREE_EXPAND_ALL_MAX` matches are read at once and shown fully open (as the page did
 * when it held every key); more stay collapsed, each group with its count of matches.
 */
export class TranslationTree {
  /** `lazy`: levels read on demand; `open`: every match read at once, the tree built from them. */
  readonly mode = signal<'lazy' | 'open'>('lazy');
  readonly loading = signal(false);
  /** How many keys match the filter (`undefined`: no filter). */
  readonly matches = signal<number | undefined>(undefined);
  readonly expandedKeys = signal<ReadonlySet<string>>(new Set<string>());
  /** The levels reading their next nodes: their "Load more" row shows "Loading…". */
  readonly loadingMore = signal<ReadonlySet<string>>(new Set<string>());

  private readonly levels = signal<ReadonlyMap<string, Level>>(new Map());
  private readonly openMatches = signal<Translation[]>([]);
  /** What was open while browsing without a filter: restored when the filter clears. */
  private browsingExpanded: ReadonlySet<string> = new Set<string>();
  private spaceId = '';
  private filter: TranslationFilterParams = {};
  /** Drops the answers of a load a newer one replaced. */
  private generation = 0;

  readonly rows = computed<TranslationTreeRow[]>(() => (this.mode() === 'open' ? buildOpenRows(this.openMatches()) : this.lazyRows('')));

  constructor(private readonly translationService: TranslationService) {}

  /** A new space or filter: the tree from its top level again. */
  async load(spaceId: string, filter: TranslationFilterParams): Promise<void> {
    const wasFiltering = isFiltering(this.filter);
    if (!wasFiltering && this.spaceId === spaceId) this.browsingExpanded = this.expandedKeys();
    if (this.spaceId !== spaceId) this.browsingExpanded = new Set<string>();
    this.spaceId = spaceId;
    this.filter = filter;
    const generation = ++this.generation;
    this.loading.set(true);
    try {
      if (isFiltering(filter) && (await this.loadOpen(generation, true))) return;
      if (generation !== this.generation) return;
      this.mode.set('lazy');
      this.openMatches.set([]);
      const expanded = isFiltering(filter) ? new Set<string>() : this.browsingExpanded;
      this.levels.set(new Map());
      await this.loadLevels(generation, ['', ...[...expanded].sort(byDepth)], expanded);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  /** After a change: every level shown read again (its loaded pages), or the open matches. */
  async refresh(): Promise<void> {
    if (!this.spaceId) return;
    const generation = ++this.generation;
    if (this.mode() === 'open' || isFiltering(this.filter)) {
      if (await this.loadOpen(generation, false)) return;
      if (generation !== this.generation) return;
      if (this.mode() === 'open') {
        // More matches than open fit now: collapsed, with counts.
        this.mode.set('lazy');
        this.levels.set(new Map());
        this.expandedKeys.set(new Set<string>());
        await this.loadLevels(generation, [''], new Set<string>());
        return;
      }
    }
    const levels = this.levels();
    const next = new Map<string, Level>();
    await Promise.all(
      [...levels].map(async ([parent, level]) => {
        const read = await this.readLevel(parent, 0, level.pages * LEVEL_SIZE);
        next.set(parent, { nodes: read.items, total: read.total, pages: level.pages });
      }),
    );
    if (generation === this.generation) this.levels.set(next);
  }

  /** The tree's expansion changed: read the levels just opened. */
  async setExpanded(keys: ReadonlySet<string>): Promise<void> {
    const opened = [...keys].filter(key => !this.expandedKeys().has(key));
    this.expandedKeys.set(keys);
    if (this.mode() !== 'lazy') return;
    const generation = this.generation;
    await this.loadLevels(generation, opened.filter(key => !this.levels().has(key)).sort(byDepth), keys);
  }

  /** The next nodes of a level ("Load more": clicked, or scrolled into view); nothing while that level is reading. */
  async loadMore(parent: string): Promise<void> {
    const level = this.levels().get(parent);
    if (!level || level.nodes.length >= level.total || this.loadingMore().has(parent)) return;
    const generation = this.generation;
    this.loadingMore.update(it => new Set([...it, parent]));
    try {
      const read = await this.readLevel(parent, level.pages, LEVEL_SIZE);
      if (generation !== this.generation) return;
      const levels = new Map(this.levels());
      const shown = new Set(level.nodes.map(it => it.path));
      const nodes = [...level.nodes, ...read.items.filter(it => !shown.has(it.path))];
      levels.set(parent, { nodes, total: read.total, pages: level.pages + 1 });
      this.levels.set(levels);
    } finally {
      this.loadingMore.update(it => new Set([...it].filter(key => key !== parent)));
    }
  }

  /**
   * With a filter: every match read at once when there are few, and the tree shown fully open (`true`). `false`: too many
   * (or none: the empty top level answers that), so the caller shows levels instead. `reset`: a new filter opens every
   * group; a refresh keeps what the user closed and opens only new groups.
   */
  private async loadOpen(generation: number, reset: boolean): Promise<boolean> {
    const first = await this.readMatches(0);
    if (generation !== this.generation) return true;
    this.matches.set(first.total);
    if (first.total === 0 || first.total > TREE_EXPAND_ALL_MAX) return false;
    const pages = [first];
    for (let page = 1; page * LEVEL_SIZE < first.total; page++) pages.push(await this.readMatches(page));
    if (generation !== this.generation) return true;
    const matches = pages.flatMap(it => it.items);
    const before = groupKeys(buildOpenRows(this.openMatches()));
    const groups = groupKeys(buildOpenRows(matches));
    const expanded = reset ? groups : new Set([...groups].filter(key => this.expandedKeys().has(key) || !before.has(key)));
    this.openMatches.set(matches);
    this.expandedKeys.set(expanded);
    this.mode.set('open');
    return true;
  }

  /** Reads `parents` in order (a parent before its children) and keeps those still open. */
  private async loadLevels(generation: number, parents: string[], expanded: ReadonlySet<string>): Promise<void> {
    for (const parent of parents) {
      if (parent && !expanded.has(parent)) continue;
      const read = await this.readLevel(parent, 0, LEVEL_SIZE);
      if (generation !== this.generation) return;
      // A group that no longer exists (renamed, deleted) answers an empty level: drop it from the expansion.
      if (parent && read.total === 0) {
        const keys = new Set(this.expandedKeys());
        keys.delete(parent);
        this.expandedKeys.set(keys);
        continue;
      }
      const levels = new Map(this.levels());
      levels.set(parent, { nodes: read.items, total: read.total, pages: 1 });
      this.levels.set(levels);
    }
    if (!parents.length || parents[0] === '') this.expandedKeys.set(new Set([...expanded].filter(key => this.levels().has(key))));
    if (!isFiltering(this.filter)) this.matches.set(undefined);
  }

  private readLevel(parent: string, page: number, size: number): Promise<Page<TranslationNode>> {
    let params = this.filterParams().set('page', page).set('size', Math.min(size, LEVEL_SIZE));
    if (parent) params = params.set('parent', parent);
    if (size > LEVEL_SIZE) return this.readLevelPages(parent, Math.ceil(size / LEVEL_SIZE));
    return firstValueFrom(this.translationService.findNodes(this.spaceId, params));
  }

  /** A level's first `pages` pages in one answer (a refresh of a level that loaded "more"). */
  private async readLevelPages(parent: string, pages: number): Promise<Page<TranslationNode>> {
    const read = await Promise.all(Array.from({ length: pages }, (_, page) => this.readLevel(parent, page, LEVEL_SIZE)));
    return { items: read.flatMap(it => it.items), page: 0, size: pages * LEVEL_SIZE, total: read[0]?.total ?? 0 };
  }

  private readMatches(page: number): Promise<Page<Translation>> {
    return firstValueFrom(this.translationService.findAll(this.spaceId, this.filterParams().set('page', page).set('size', LEVEL_SIZE)));
  }

  private filterParams(): HttpParams {
    let params = new HttpParams();
    for (const [name, value] of Object.entries(this.filter)) {
      if (Array.isArray(value)) for (const it of value) params = params.append(name, it);
      else if (value) params = params.set(name, value);
    }
    return params;
  }

  /** The rows of a loaded level: a group not read yet shows one "Loading…" row; a level with more shows "Load more". */
  private lazyRows(parent: string): TranslationTreeRow[] {
    const level = this.levels().get(parent);
    if (!level) return [];
    const rows: TranslationTreeRow[] = level.nodes.map(node => {
      const row: TranslationTreeRow = {
        key: node.path,
        name: node.name,
        kind: 'node',
        count: node.children,
        translation: node.translation,
      };
      if (node.children > 0) {
        row.children = this.levels().has(node.path)
          ? this.lazyRows(node.path)
          : [{ key: `${node.path}${PLACEHOLDER}loading`, name: 'Loading…', kind: 'loading', count: 0 }];
      }
      return row;
    });
    if (level.nodes.length < level.total) {
      rows.push({ key: `${parent}${PLACEHOLDER}more`, name: 'Load more', kind: 'more', count: level.total - level.nodes.length, parent });
    }
    return rows;
  }
}

/** Whether the filter narrows the keys (the locale alone doesn't). */
export function isFiltering(filter: TranslationFilterParams): boolean {
  return Object.entries(filter).some(([name, value]) => name !== 'locale' && (Array.isArray(value) ? value.length > 0 : !!value));
}

/** The tree of the given keys, every node with the count of keys below it. */
export function buildOpenRows(translations: Translation[]): TranslationTreeRow[] {
  const root: TranslationTreeRow[] = [];
  const byPath = new Map<string, TranslationTreeRow>();
  for (const translation of translations) {
    const segments = translation.key.split('.');
    let level = root;
    segments.forEach((name, index) => {
      const path = segments.slice(0, index + 1).join('.');
      let row = byPath.get(path);
      if (!row) {
        row = { key: path, name, kind: 'node', count: 0 };
        byPath.set(path, row);
        level.push(row);
      }
      if (index === segments.length - 1) row.translation = translation;
      else {
        row.count++;
        row.children ??= [];
        level = row.children;
      }
    });
  }
  return root;
}

function groupKeys(rows: readonly TranslationTreeRow[]): Set<string> {
  const keys = new Set<string>();
  const visit = (items: readonly TranslationTreeRow[]) => {
    for (const row of items) {
      if (row.children?.length) {
        keys.add(row.key);
        visit(row.children);
      }
    }
  };
  visit(rows);
  return keys;
}

const byDepth = (a: string, b: string) => a.split('.').length - b.split('.').length;

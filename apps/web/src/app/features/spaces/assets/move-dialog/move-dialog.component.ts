import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SpaceStore } from '@core/stores/space.store';
import { breadcrumbs, folderPath, subtreeIds } from '@core/utils/folder-tree';
import { AssetFolderSummary, AssetKind } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideHouse, lucideSearch } from '@ng-icons/lucide';
import { LlTreeImports } from '@shared/components/tree/tree.imports';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { MoveDialogContext, MoveDialogResult, MoveTarget } from './move-dialog.model';

/** The root's key in the tree (a folder's key is its id). */
export const MOVE_ROOT_KEY = '~';

/**
 * Where to move a file or folder: the root and every asset folder of the space as a tree (`SpaceStore.assetFolders()`),
 * the path to where the item is now open and marked. A folder can not go under itself: it and everything under it are
 * left out. The search filters folders by name or path, keeping their parents, with every branch open. The same as the
 * Contents Move dialog.
 */
@Component({
  selector: 'll-asset-move-dialog',
  templateUrl: './move-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, LlTreeImports, HlmButtonImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideFolder, lucideHouse, lucideSearch })],
})
export class MoveDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<MoveDialogResult>>(BrnDialogRef);
  private readonly context = injectBrnDialogContext<MoveDialogContext>();
  /** Every folder of the space, from `SpaceStore` (live). */
  private readonly folders = inject(SpaceStore).assetFolders;
  private readonly folderMap = computed(() => new Map(this.folders().map(it => [it.id, it])));

  /** The item's folder now (`MOVE_ROOT_KEY`: the root). */
  private readonly currentKey = this.context.asset.parentId ?? MOVE_ROOT_KEY;

  readonly search = signal('');
  readonly selectedKey = signal<string | undefined>(undefined);
  /** Open at the start: the root and the folders down to where the item is. */
  readonly expandedKeys = signal<ReadonlySet<string>>(
    new Set([MOVE_ROOT_KEY, ...breadcrumbs(this.folderMap(), this.context.asset.parentId ?? null).map(it => it.id)]),
  );

  /** The root, with the folders that are targets under it (matching the search, with their parents). */
  readonly nodes = computed<MoveTarget[]>(() => {
    const { asset } = this.context;
    const all = this.folders();
    const map = this.folderMap();
    const excluded = asset.kind === AssetKind.FOLDER ? subtreeIds(all, asset.id) : new Set<string>();
    const folders = all.filter(it => !excluded.has(it.id));
    const pathOf = (folder: AssetFolderSummary) => folderPath(map, folder.id, it => it.name);
    const term = this.search().trim().toLowerCase();
    const shown = term
      ? this.withAncestors(folders, it => it.name.toLowerCase().includes(term) || pathOf(it).toLowerCase().includes(term))
      : null;
    const childrenOf = (parentId: string | undefined): MoveTarget[] =>
      folders
        .filter(it => it.parentId === parentId && (!shown || shown.has(it.id)))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(it => {
          const children = childrenOf(it.id);
          return {
            key: it.id,
            id: it.id,
            name: it.name,
            path: pathOf(it),
            current: it.id === this.currentKey,
            children: children.length ? children : undefined,
          };
        });
    const top = childrenOf(undefined);
    return [
      {
        key: MOVE_ROOT_KEY,
        id: null,
        name: 'Root',
        path: '',
        current: this.currentKey === MOVE_ROOT_KEY,
        children: top.length ? top : undefined,
      },
    ];
  });

  /** While searching every branch is open, so each match shows. */
  readonly shownExpandedKeys = computed<ReadonlySet<string>>(() =>
    this.search().trim() ? new Set([MOVE_ROOT_KEY, ...this.folders().map(it => it.id)]) : this.expandedKeys(),
  );

  /** A target other than where the item is now. */
  readonly canMove = computed(() => {
    const key = this.selectedKey();
    return key !== undefined && key !== this.currentKey;
  });

  /** The filter box: a folder's name or path. */
  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onExpandedKeysChange(keys: ReadonlySet<string>): void {
    if (!this.search().trim()) this.expandedKeys.set(keys);
  }

  save(): void {
    const key = this.selectedKey();
    if (key === undefined || !this.canMove()) return;
    this.dialogRef.close({ parentId: key === MOVE_ROOT_KEY ? null : key });
  }

  /** The ids of the folders matching, and of every folder above them. */
  private withAncestors(folders: AssetFolderSummary[], matches: (folder: AssetFolderSummary) => boolean): Set<string> {
    const byId = new Map(folders.map(it => [it.id, it]));
    const ids = new Set<string>();
    for (const folder of folders.filter(matches)) {
      for (let it: AssetFolderSummary | undefined = folder; it && !ids.has(it.id); it = it.parentId ? byId.get(it.parentId) : undefined) {
        ids.add(it.id);
      }
    }
    return ids;
  }
}

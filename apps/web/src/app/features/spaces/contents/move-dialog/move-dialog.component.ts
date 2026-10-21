import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ContentService } from '@core/services/content.service';
import { folderPath, subtreeIds } from '@core/utils/folder-tree';
import { ContentFolderSummary, ContentKind } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideHouse } from '@ng-icons/lucide';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';

import { MoveDialogContext, MoveDialogResult, MoveTarget } from './move-dialog.model';

@Component({
  selector: 'll-content-move-dialog',
  templateUrl: './move-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmComboboxImports, HlmButtonImports, HlmFieldImports, HlmIconImports],
  providers: [provideIcons({ lucideFolder, lucideHouse })],
})
export class MoveDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contentService = inject(ContentService);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<MoveDialogResult>>(BrnDialogRef);

  private readonly context = injectBrnDialogContext<MoveDialogContext>();

  form: FormGroup = this.fb.group({
    target: this.fb.control<MoveTarget | null>(null, Validators.required),
  });

  readonly search = signal('');
  readonly selected = signal<MoveTarget | null>(null);

  /** Every folder of the space, from the editor's folder map endpoint. */
  private readonly folders = toSignal(this.contentService.findAllFolders(this.context.spaceId), {
    initialValue: [] as ContentFolderSummary[],
  });

  /**
   * The root and every folder, by path, matching the search; without where the item already is, and for a folder
   * without itself and everything under it.
   */
  readonly options = computed<MoveTarget[]>(() => {
    const { content } = this.context;
    const folders = this.folders();
    const map = new Map(folders.map(it => [it.id, it]));
    const excluded = content.kind === ContentKind.FOLDER ? subtreeIds(folders, content.id) : new Set<string>();
    const current = content.parentId ?? null;
    const term = this.search().trim().toLowerCase();
    const targets: MoveTarget[] = [
      { id: null, name: 'Root', path: '' },
      ...folders
        .filter(it => !excluded.has(it.id))
        .map(it => ({ id: it.id, name: it.name, path: folderPath(map, it.id, folder => folder.slug) })),
    ];
    return targets
      .filter(it => it.id !== current)
      .filter(it => !term || (it.id !== null && (it.name.toLowerCase().includes(term) || it.path.toLowerCase().includes(term))))
      .sort((a, b) => a.path.localeCompare(b.path));
  });

  protected readonly displayItem = (item?: MoveTarget): string => (item ? `${item.name} | ${item.path || '~'}` : '');

  protected readonly noOpFilter = (): boolean => true;

  /** Cleared: `undefined` from the combobox, kept as `null`. */
  choose(target: MoveTarget | null | undefined): void {
    this.selected.set(target ?? null);
    this.form.controls['target'].setValue(target ?? null);
  }

  save(): void {
    const target = this.selected();
    if (target) this.dialogRef.close({ parentId: target.id });
  }
}

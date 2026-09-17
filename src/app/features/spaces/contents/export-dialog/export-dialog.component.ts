import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideCloudDownload, lucideFileText, lucideFolder } from '@ng-icons/lucide';
import { Content, ContentKind } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { debounceTime, startWith, switchMap } from 'rxjs';

import { ExportDialogContext, ExportDialogResult } from './export-dialog.model';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmIconImports, HlmComboboxImports, HlmFieldImports],
  providers: [provideIcons({ lucideCloudDownload, lucideFolder, lucideFileText })],
})
export class ExportDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contentService = inject(ContentService);
  private readonly dialogRef = inject<BrnDialogRef<ExportDialogResult>>(BrnDialogRef);

  /** Required: the content search is scoped to the space it carries. */
  private readonly context = injectBrnDialogContext<ExportDialogContext>();

  readonly ContentKind = ContentKind;

  form: FormGroup = this.fb.group({
    path: this.fb.control<string | undefined>(undefined),
  });

  search = signal('');
  selectedItem = signal<Content | null>(null);

  filteredContents = toSignal(
    toObservable(this.search).pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.contentService.findAllByName(this.context.spaceId, it, 5)),
    ),
    { initialValue: [] as Content[] },
  );

  protected readonly displayItem = (item?: Content): string => (item ? `${item.name} | ${item.fullSlug}` : '');
  protected readonly noOpFilter = (): boolean => true;

  onValueChange(item: Content | null): void {
    this.selectedItem.set(item);
    this.form.controls['path'].setValue(item?.id ?? undefined);
  }

  save(): void {
    this.dialogRef.close(this.form.value as ExportDialogResult);
  }
}

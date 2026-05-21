import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideHouse } from '@ng-icons/lucide';
import { ContentFolder } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { debounceTime, startWith, switchMap } from 'rxjs';

import { MoveDialogModel } from './move-dialog.model';

@Component({
  selector: 'll-content-move-dialog',
  templateUrl: './move-dialog.component.html',
  styleUrls: ['./move-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmComboboxImports, HlmButtonImports, HlmFieldImports, HlmIconImports],
  providers: [provideIcons({ lucideFolder, lucideHouse })],
})
export class MoveDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contentService = inject(ContentService);
  readonly fe = inject(FormErrorHandlerService);
  readonly data = inject<MoveDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    path: this.fb.control(null, Validators.required),
  });

  // fullSlug '~' acts as sentinel for root — id is never accessed for this item
  readonly rootFolder: ContentFolder = { name: 'Root', fullSlug: '~' } as ContentFolder;

  readonly search = signal('');
  readonly selectedFolder = signal<ContentFolder | null>(null);

  readonly filteredFolders = toSignal(
    toObservable(this.search).pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.contentService.findAllFoldersByName(this.data.spaceId, it, 5)),
    ),
    { initialValue: [] as ContentFolder[] },
  );

  protected readonly displayItem = (item?: ContentFolder): string => (item ? `${item.name} | ${item.fullSlug}` : '');

  protected readonly noOpFilter = (): boolean => true;

  protected onValueChange(folder: ContentFolder | null): void {
    this.selectedFolder.set(folder);
    this.form.controls['path'].setValue(folder ? folder.fullSlug : null);
  }
}

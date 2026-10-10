import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { FirebaseImport, FirebaseSourceSpace } from '@localess/shared';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { FirebaseImportProgressComponent } from '../firebase-import-progress/firebase-import-progress.component';

/** Connect to a Firebase environment, pick one space, import it and follow its progress. */
@Component({
  selector: 'll-firebase-import-dialog',
  templateUrl: './firebase-import-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, HlmButtonImports, HlmDialogImports, HlmFieldImports, HlmInputImports, FirebaseImportProgressComponent],
})
export class FirebaseImportDialogComponent {
  private readonly imports = inject(FirebaseImportService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    origin: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    token: ['', Validators.required],
  });
  readonly spaces = signal<FirebaseSourceSpace[]>([]);
  readonly selected = signal<string | undefined>(undefined);
  readonly run = signal<FirebaseImport | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly busy = signal(false);

  isSelectable(space: FirebaseSourceSpace): boolean {
    return space.importedAs === null;
  }

  connect(): void {
    const { origin, token } = this.form.getRawValue();
    this.error.set(undefined);
    this.busy.set(true);
    this.imports.sourceSpaces(origin, token).subscribe({
      next: spaces => {
        this.spaces.set(spaces);
        this.busy.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Cannot connect to the Firebase environment');
        this.busy.set(false);
      },
    });
  }

  startImport(): void {
    const spaceId = this.selected();
    if (!spaceId) return;
    const { origin, token } = this.form.getRawValue();
    this.error.set(undefined);
    this.imports.start(origin, token, spaceId).subscribe({
      next: run => {
        this.run.set(run);
        this.imports.poll(run.id).subscribe(it => this.run.set(it));
      },
      error: err => this.error.set(err?.error?.message ?? 'The import could not be started'),
    });
  }
}

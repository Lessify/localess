import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { serverReason } from '@core/utils/api-error';
import { FirebaseImport, FirebaseSourceSpace } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

import { FirebaseImportProgressComponent } from '../firebase-import-progress/firebase-import-progress.component';
import { FirebaseImportRunHeaderComponent } from '../firebase-import-run-header/firebase-import-run-header.component';
import { FirebaseImportStepsComponent } from '../firebase-import-steps/firebase-import-steps.component';

/** Connect to a Firebase environment, pick one space, import it and follow its progress: three steps. */
@Component({
  selector: 'll-firebase-import-dialog',
  templateUrl: './firebase-import-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmFieldImports,
    HlmInputImports,
    HlmRadioGroupImports,
    HlmSpinnerImports,
    FirebaseImportProgressComponent,
    FirebaseImportRunHeaderComponent,
    FirebaseImportStepsComponent,
  ],
})
export class FirebaseImportDialogComponent {
  private readonly imports = inject(FirebaseImportService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(BrnDialogRef);

  readonly form = this.fb.nonNullable.group({
    origin: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    token: ['', Validators.required],
  });
  /** The Firebase environment's spaces, once connected (an environment may have none). */
  readonly spaces = signal<FirebaseSourceSpace[] | undefined>(undefined);
  readonly selected = signal<string | undefined>(undefined);
  readonly run = signal<FirebaseImport | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly busy = signal(false);

  /** 1 Connect, 2 Choose space, 3 Import. */
  readonly step = computed(() => (this.run() ? 3 : this.spaces() ? 2 : 1));
  readonly selectedName = computed(() => this.spaces()?.find(it => it.id === this.selected())?.name);

  /** The radio group answers the chosen space's id. */
  selectSpace(value: unknown): void {
    this.selected.set(typeof value === 'string' ? value : undefined);
  }

  isSelectable(space: FirebaseSourceSpace): boolean {
    return space.importedAs === null;
  }

  connect(): void {
    const { origin, token } = this.form.getRawValue();
    this.error.set(undefined);
    this.busy.set(true);
    this.imports.findSourceSpaces(origin, token).subscribe({
      next: spaces => {
        this.spaces.set(spaces);
        this.busy.set(false);
      },
      error: err => {
        this.error.set(serverReason(err) ?? 'Cannot connect to the Firebase environment');
        this.busy.set(false);
      },
    });
  }

  /** Back to the connection, to change the URL or the token. */
  back(): void {
    this.spaces.set(undefined);
    this.selected.set(undefined);
    this.error.set(undefined);
  }

  startImport(): void {
    const spaceId = this.selected();
    if (!spaceId) return;
    const { origin, token } = this.form.getRawValue();
    this.error.set(undefined);
    this.busy.set(true);
    this.imports.start(origin, token, spaceId).subscribe({
      next: run => {
        this.busy.set(false);
        this.run.set(run);
        this.imports.poll(run.id).subscribe(it => this.run.set(it));
      },
      error: err => {
        this.busy.set(false);
        this.error.set(serverReason(err) ?? 'The import could not be started');
      },
    });
  }

  /** The poll stops by itself once it sees the run FAILED. */
  cancel(): void {
    const run = this.run();
    if (!run) return;
    this.error.set(undefined);
    this.imports.cancel(run.id).subscribe({
      next: cancelled => this.run.set(cancelled),
      error: err => this.error.set(serverReason(err) ?? 'The import could not be cancelled'),
    });
  }

  /** The imported space, once the run finished. */
  openSpace(): void {
    const spaceId = this.run()?.spaceId;
    if (!spaceId) return;
    this.dialogRef.close();
    void this.router.navigate(['/features', 'spaces', spaceId, 'dashboard']);
  }

  close(): void {
    this.dialogRef.close();
  }
}

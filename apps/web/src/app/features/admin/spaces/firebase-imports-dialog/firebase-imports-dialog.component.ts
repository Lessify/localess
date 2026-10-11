import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { FirebaseImport } from '@localess/shared';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

import { FirebaseImportProgressComponent } from '../firebase-import-progress/firebase-import-progress.component';

/** Past imports from Firebase, newest first; one opens its stage-by-stage progress. */
@Component({
  selector: 'll-firebase-imports-dialog',
  templateUrl: './firebase-imports-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, HlmButtonImports, HlmDialogImports, FirebaseImportProgressComponent],
})
export class FirebaseImportsDialogComponent implements OnInit {
  private readonly imports = inject(FirebaseImportService);

  readonly runs = signal<FirebaseImport[]>([]);
  readonly selectedRun = signal<FirebaseImport | undefined>(undefined);

  ngOnInit(): void {
    this.imports.findAll().subscribe(runs => this.runs.set(runs));
  }

  select(run: FirebaseImport | undefined): void {
    this.selectedRun.set(run);
  }

  /** Stops a running run; it shows as failed, in the list and in the open view. */
  cancel(run: FirebaseImport): void {
    this.imports.cancel(run.id).subscribe(cancelled => {
      this.runs.update(runs => runs.map(it => (it.id === cancelled.id ? cancelled : it)));
      if (this.selectedRun()?.id === cancelled.id) this.selectedRun.set(cancelled);
    });
  }

  /** A failed run is not resumed: its space (if it got that far) is deleted, then the space imported again. */
  failureHint(run: FirebaseImport): string | undefined {
    if (run.status !== 'FAILED') return undefined;
    return run.spaceId
      ? 'The space it created is kept as it is: delete it in Admin → Spaces, then import again.'
      : 'Nothing was created: start the import again.';
  }
}

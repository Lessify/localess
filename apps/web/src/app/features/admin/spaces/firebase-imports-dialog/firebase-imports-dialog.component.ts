import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { FirebaseImport } from '@localess/shared';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

import { FirebaseImportProgressComponent } from '../firebase-import-progress/firebase-import-progress.component';
import { FirebaseImportRunHeaderComponent } from '../firebase-import-run-header/firebase-import-run-header.component';

const STATUS_LABELS: Record<FirebaseImport['status'], string> = { RUNNING: 'Importing', FINISHED: 'Imported', FAILED: 'Failed' };

/** Past imports from Firebase, newest first; one opens its stage-by-stage progress. */
@Component({
  selector: 'll-firebase-imports-dialog',
  templateUrl: './firebase-imports-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    FirebaseImportProgressComponent,
    FirebaseImportRunHeaderComponent,
  ],
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

  statusLabel(run: FirebaseImport): string {
    return STATUS_LABELS[run.status];
  }
}

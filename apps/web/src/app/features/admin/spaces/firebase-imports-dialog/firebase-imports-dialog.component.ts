import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { FirebaseImport } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideCircleCheck, lucideCircleX } from '@ng-icons/lucide';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

import { durationText, originHost, warningCount } from '../firebase-import.utils';
import { FirebaseImportProgressComponent } from '../firebase-import-progress/firebase-import-progress.component';
import { FirebaseImportRunHeaderComponent } from '../firebase-import-run-header/firebase-import-run-header.component';

const STATUS_LABELS: Record<FirebaseImport['status'], string> = { RUNNING: 'Importing', FINISHED: 'Imported', FAILED: 'Failed' };

/**
 * Past imports from Firebase, newest first, as a list of items: the status, the source space with its warnings, where
 * from, who, when and how long; Open space for a finished run, Cancel for a running one (followed until it ends).
 * A row opens the run's stage-by-stage view.
 */
@Component({
  selector: 'll-firebase-imports-dialog',
  templateUrl: './firebase-imports-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmIconImports,
    HlmItemImports,
    HlmSpinnerImports,
    FirebaseImportProgressComponent,
    FirebaseImportRunHeaderComponent,
  ],
  providers: [provideIcons({ lucideChevronRight, lucideCircleCheck, lucideCircleX })],
})
export class FirebaseImportsDialogComponent implements OnInit {
  private readonly imports = inject(FirebaseImportService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(BrnDialogRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly runs = signal<FirebaseImport[]>([]);
  readonly selectedRun = signal<FirebaseImport | undefined>(undefined);

  readonly host = originHost;
  readonly warningCount = warningCount;
  readonly duration = durationText;

  ngOnInit(): void {
    this.imports.findAll().subscribe(runs => {
      this.runs.set(runs);
      // A running import moves on while the list is open: followed until it ends, in the list and the open view.
      for (const run of runs.filter(it => it.status === 'RUNNING')) {
        this.imports
          .poll(run.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(it => this.replace(it));
      }
    });
  }

  select(run: FirebaseImport | undefined): void {
    this.selectedRun.set(run);
  }

  /** Stops a running run; it shows as failed, in the list and in the open view. */
  cancel(run: FirebaseImport): void {
    this.imports.cancel(run.id).subscribe(cancelled => this.replace(cancelled));
  }

  /** The space a finished run created. */
  openSpace(run: FirebaseImport): void {
    if (!run.spaceId) return;
    this.dialogRef.close();
    void this.router.navigate(['/features', 'spaces', run.spaceId, 'dashboard']);
  }

  /** The status icon's tile: red for a failed run. */
  mediaClass(run: FirebaseImport): string {
    return run.status === 'FAILED' ? 'border-destructive/30 bg-destructive/10' : 'bg-muted';
  }

  statusLabel(run: FirebaseImport): string {
    return STATUS_LABELS[run.status];
  }

  private replace(run: FirebaseImport): void {
    this.runs.update(runs => runs.map(it => (it.id === run.id ? run : it)));
    if (this.selectedRun()?.id === run.id) this.selectedRun.set(run);
  }
}

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
}

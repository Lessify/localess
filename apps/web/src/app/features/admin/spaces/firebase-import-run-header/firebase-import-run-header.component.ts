import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FirebaseImport } from '@localess/shared';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

import { originHost, warningCount } from '../firebase-import.utils';

/** A run's source space, the Firebase environment it came from, and how it went (a badge). */
@Component({
  selector: 'll-firebase-import-run-header',
  templateUrl: './firebase-import-run-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadgeImports],
})
export class FirebaseImportRunHeaderComponent {
  readonly run = input.required<FirebaseImport>();

  readonly host = computed(() => originHost(this.run().origin));
  readonly warningCount = computed(() => warningCount(this.run()));

  /** Importing, Failed, Imported, or Imported with its warnings counted. */
  readonly statusText = computed(() => {
    const run = this.run();
    if (run.status === 'RUNNING') return 'Importing';
    if (run.status === 'FAILED') return 'Failed';
    const warnings = this.warningCount();
    return warnings ? `Imported · ${warnings} ${warnings === 1 ? 'warning' : 'warnings'}` : 'Imported';
  });
}

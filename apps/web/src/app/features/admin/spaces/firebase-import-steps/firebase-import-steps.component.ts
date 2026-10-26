import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { HlmIconImports } from '@spartan-ng/helm/icon';

/** The steps of an import from Firebase, in order. */
export const FIREBASE_IMPORT_STEPS = ['Connect', 'Choose space', 'Import'] as const;

/** Where the import dialog is: steps before the current one are done (a check), the current one is marked. */
@Component({
  selector: 'll-firebase-import-steps',
  templateUrl: './firebase-import-steps.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmIconImports],
  providers: [provideIcons({ lucideCheck })],
})
export class FirebaseImportStepsComponent {
  /** The current step, from 1. */
  readonly current = input.required<number>();

  readonly steps = FIREBASE_IMPORT_STEPS;
}

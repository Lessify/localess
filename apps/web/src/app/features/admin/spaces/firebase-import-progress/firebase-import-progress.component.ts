import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FirebaseImport, FirebaseImportStage, FirebaseImportStageName } from '@localess/shared';

const LABELS: Record<FirebaseImportStageName, string> = {
  space: 'Space',
  locales: 'Locales',
  environments: 'Environments',
  tokens: 'Tokens',
  webhooks: 'Webhooks (imported disabled)',
  translations: 'Translations',
  schemas: 'Schemas',
  assets: 'Assets',
  contents: 'Contents',
  contentMigration: 'Content migration',
};

/** The stages of one import run: status, count, warnings and the error of a failed stage. */
@Component({
  selector: 'll-firebase-import-progress',
  templateUrl: './firebase-import-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirebaseImportProgressComponent {
  readonly run = input.required<FirebaseImport>();

  label(stage: FirebaseImportStageName): string {
    return LABELS[stage];
  }

  countText(stage: FirebaseImportStage): string {
    return stage.total !== undefined ? `${stage.count} / ${stage.total}` : `${stage.count}`;
  }
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FirebaseImport, FirebaseImportStage, FirebaseImportStageName } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleX, lucideTriangleAlert } from '@ng-icons/lucide';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

const LABELS: Record<FirebaseImportStageName, string> = {
  space: 'Space',
  locales: 'Locales',
  environments: 'Environments',
  webhooks: 'Webhooks',
  translations: 'Translations',
  schemas: 'Schemas',
  assets: 'Assets',
  contents: 'Contents',
  contentMigration: 'References',
};

/** What a tile of the finished run means, where its label does not say it. */
const HINTS: Partial<Record<FirebaseImportStageName, string>> = {
  webhooks: 'Imported disabled',
  contentMigration: 'Documents whose links, references and assets were updated to their new ids',
};

/** The segment of each stage status. */
const SEGMENTS: Record<FirebaseImportStage['status'], string> = {
  DONE: 'bg-primary',
  RUNNING: 'bg-primary/40 animate-pulse',
  FAILED: 'bg-destructive',
  PENDING: 'bg-muted',
};

/** What a stage counts, for "50 of 109 files". */
const UNITS: Partial<Record<FirebaseImportStageName, string>> = { assets: 'files', contentMigration: 'documents updated' };

/**
 * One import run: a segment per stage across the top; while it runs, the stage at work with its own bar; once it
 * finished, what was imported and the warnings; once it failed, the failing stage, its error and what to do next.
 */
@Component({
  selector: 'll-firebase-import-progress',
  templateUrl: './firebase-import-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmIconImports, HlmAccordionImports, HlmProgressImports, HlmSpinnerImports],
  providers: [provideIcons({ lucideCircleX, lucideTriangleAlert })],
})
export class FirebaseImportProgressComponent {
  readonly run = input.required<FirebaseImport>();

  /** The stage at work, or the one that failed. */
  readonly current = computed(() => this.run().stages.find(it => it.status === 'RUNNING' || it.status === 'FAILED'));
  /** Its position, from 1. */
  readonly currentNumber = computed(() => {
    const current = this.current();
    return current ? this.run().stages.indexOf(current) + 1 : 0;
  });
  readonly done = computed(() => this.run().stages.filter(it => it.status === 'DONE'));
  readonly pending = computed(() => this.run().stages.filter(it => it.status === 'PENDING'));
  /** What was imported, every stage but the space itself. */
  readonly imported = computed(() => this.run().stages.filter(it => it.stage !== 'space'));
  readonly webhooksImported = computed(() => !!this.run().stages.find(it => it.stage === 'webhooks')?.count);
  readonly withWarnings = computed(() => this.run().stages.filter(it => it.warningCount));
  /** The error of the failed run, worded on its own when the run failed before any stage ran. */
  readonly errorMessage = computed(() => this.run().error?.message ?? this.current()?.error);
  /** A failed run is not resumed: its space (if it got that far) is deleted, then the space imported again. */
  readonly failureHint = computed(() => {
    const run = this.run();
    if (run.status !== 'FAILED') return undefined;
    return run.spaceId
      ? 'The space it created is kept as it is: delete it in Admin → Spaces, then import again.'
      : 'Nothing was created: start the import again.';
  });

  label(stage: FirebaseImportStageName): string {
    return LABELS[stage];
  }

  hint(stage: FirebaseImportStageName): string | null {
    return HINTS[stage] ?? null;
  }

  segmentClass(stage: FirebaseImportStage): string {
    return SEGMENTS[stage.status];
  }

  /** "50 of 109 files" while counting toward a total, else the count ("41"). */
  countText(stage: FirebaseImportStage): string {
    const unit = UNITS[stage.stage];
    if (stage.total !== undefined) return `${stage.count} of ${stage.total}${unit ? ` ${unit}` : ''}`;
    return unit ? `${stage.count} ${unit}` : `${stage.count}`;
  }

  /** The bar of a stage with a total, null (moving, no end known) without one. */
  percent(stage: FirebaseImportStage): number | null {
    if (stage.total === undefined) return null;
    return stage.total ? Math.round((stage.count / stage.total) * 100) : 100;
  }

  /** "Schemas 41, Assets 50 of 109", for the stages a failed run finished. */
  doneText(): string {
    return this.done()
      .map(it => `${this.label(it.stage)} ${this.countText(it)}`)
      .join(', ');
  }

  names(stages: FirebaseImportStage[]): string {
    return stages.map(it => this.label(it.stage)).join(', ');
  }
}

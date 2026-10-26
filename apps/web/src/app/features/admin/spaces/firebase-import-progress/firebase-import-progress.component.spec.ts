import { TestBed } from '@angular/core/testing';
import { FIREBASE_IMPORT_STAGES, FirebaseImport, FirebaseImportStage } from '@localess/shared';
import { FirebaseImportProgressComponent } from './firebase-import-progress.component';

/** Every stage DONE up to `at`, which has `status`, then PENDING; `extra` patches stages by name. */
function stages(at: number, status: FirebaseImportStage['status'], extra: Partial<Record<string, Partial<FirebaseImportStage>>> = {}) {
  return FIREBASE_IMPORT_STAGES.map((stage, index) => ({
    stage,
    status: index < at ? 'DONE' : index === at ? status : 'PENDING',
    count: index < at ? 2 : 0,
    ...extra[stage],
  })) as FirebaseImportStage[];
}

function run(patch: Partial<FirebaseImport>): FirebaseImport {
  return {
    id: 'r1',
    origin: 'https://localess-prod.web.app',
    sourceSpaceId: 'fb1',
    sourceSpaceName: 'Site',
    status: 'RUNNING',
    stages: stages(0, 'PENDING'),
    startedBy: { name: 'Admin', email: 'admin@example.com' },
    startedAt: '2026-10-26T09:00:00.000Z',
    ...patch,
  };
}

describe('FirebaseImportProgressComponent', () => {
  function render(value: FirebaseImport) {
    const fixture = TestBed.createComponent(FirebaseImportProgressComponent);
    fixture.componentRef.setInput('run', value);
    fixture.detectChanges();
    return { component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }
  const text = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  it('words counts with their unit and total, and labels stages', () => {
    const { component } = render(run({}));
    expect(component.label('contentMigration')).toBe('References');
    expect(component.countText({ stage: 'assets', status: 'RUNNING', count: 50, total: 109 })).toBe('50 of 109 files');
    expect(component.countText({ stage: 'schemas', status: 'DONE', count: 41 })).toBe('41');
    expect(component.percent({ stage: 'assets', status: 'RUNNING', count: 50, total: 109 })).toBe(46);
    // No total: the bar moves without an end.
    expect(component.percent({ stage: 'contents', status: 'RUNNING', count: 3 })).toBeNull();
  });

  it('draws a segment per stage: done, at work, waiting', () => {
    const { el } = render(run({ stages: stages(6, 'RUNNING', { assets: { count: 50, total: 109 } }) }));
    const segments = [...el.querySelectorAll('ol[aria-hidden] li')];
    expect(segments).toHaveLength(9);
    expect(
      segments.map(it => (it.className.includes('bg-primary/40') ? 'R' : it.classList.contains('bg-primary') ? 'D' : 'P')).join(''),
    ).toBe('DDDDDDRPP');
  });

  it('while running, shows the stage at work with its bar, what is done and what is next', () => {
    const { el } = render(run({ stages: stages(6, 'RUNNING', { assets: { count: 50, total: 109 } }) }));
    expect(text(el)).toContain('Assets');
    expect(text(el)).toContain('Stage 7 of 9');
    expect(text(el)).toContain('50 of 109 files');
    expect(text(el)).toContain('46%');
    expect(el.querySelector('hlm-progress')?.getAttribute('aria-label')).toBe('Assets');
    expect(text(el)).toContain('Done: Space, Locales, Environments, Webhooks, Translations, Schemas.');
    expect(text(el)).toContain('Next: Contents, References.');
  });

  it('once finished, shows what was imported and the warnings', () => {
    const { el } = render(
      run({
        status: 'FINISHED',
        stages: stages(9, 'DONE', {
          webhooks: { count: 1 },
          schemas: { count: 21, warningCount: 3, warnings: ["productVariant: field 'color'", "productVariant: field 'size'"] },
        }),
      }),
    );
    const tiles = [...el.querySelectorAll('dl > div')].map(it => `${text(it.querySelector('dt')!)} ${text(it.querySelector('dd')!)}`);
    expect(tiles).toHaveLength(8);
    expect(tiles).toContain('Schemas 21');
    expect(text(el)).toContain('Webhooks are imported disabled');
    expect(text(el)).toContain('3 warnings · Schemas');
    expect(text(el)).toContain("productVariant: field 'color'");
    // Only the first warnings are kept; the rest are counted.
    expect(text(el)).toContain('And 1 more, not kept.');
  });

  it('once failed, names the stage, shows its error, what finished, and what to do', () => {
    const { el } = render(
      run({
        status: 'FAILED',
        spaceId: 's1',
        stages: stages(6, 'FAILED', { assets: { count: 50, total: 109 } }),
        error: { stage: 'assets', message: 'Asset answered 500: grant the role' },
      }),
    );
    const alert = el.querySelector('[role="alert"]')!;
    expect(text(alert)).toContain('Stage 7 of 9 · Assets failed at 50 of 109 files');
    expect(text(alert)).toContain('Asset answered 500: grant the role');
    expect(text(el)).toContain('Finished before it: Space 2, Locales 2');
    expect(text(el)).toContain('The space it created is kept as it is: delete it in Admin → Spaces, then import again.');
  });

  it('a run that failed before creating its space says to start again', () => {
    const { component } = render(run({ status: 'FAILED', stages: stages(0, 'FAILED'), error: { stage: 'space', message: 'x' } }));
    expect(component.failureHint()).toBe('Nothing was created: start the import again.');
    expect(render(run({ status: 'FINISHED', spaceId: 's1' })).component.failureHint()).toBeUndefined();
  });
});

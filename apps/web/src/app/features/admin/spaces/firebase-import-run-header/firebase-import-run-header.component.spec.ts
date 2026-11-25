import { TestBed } from '@angular/core/testing';
import { FirebaseImport } from '@localess/shared';
import { FirebaseImportRunHeaderComponent } from './firebase-import-run-header.component';

describe('FirebaseImportRunHeaderComponent', () => {
  function render(patch: Partial<FirebaseImport>) {
    const fixture = TestBed.createComponent(FirebaseImportRunHeaderComponent);
    fixture.componentRef.setInput('run', {
      sourceSpaceName: 'Site',
      origin: 'https://localess-prod.web.app/',
      status: 'RUNNING',
      stages: [],
      ...patch,
    } as FirebaseImport);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim();
  }

  it('names the space, the host it came from, and how the run went', () => {
    const running = render({});
    expect(running).toContain('Site');
    expect(running).toContain('from localess-prod.web.app');
    expect(running).toContain('Importing');
    expect(render({ status: 'FAILED' })).toContain('Failed');
    expect(render({ status: 'FINISHED' })).toContain('Imported');
    expect(
      render({
        status: 'FINISHED',
        stages: [
          { stage: 'schemas', status: 'DONE', count: 21, warningCount: 2 },
          { stage: 'assets', status: 'DONE', count: 3, warningCount: 1 },
        ],
      }),
    ).toContain('Imported · 3 warnings');
  });
});

import { TestBed } from '@angular/core/testing';
import { FirebaseImport } from '@localess/shared';
import { FirebaseImportProgressComponent } from './firebase-import-progress.component';

describe('FirebaseImportProgressComponent', () => {
  it('labels stages and formats counts with totals', () => {
    TestBed.overrideComponent(FirebaseImportProgressComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(FirebaseImportProgressComponent);
    fixture.componentRef.setInput('run', {
      status: 'RUNNING',
      stages: [{ stage: 'assets', status: 'RUNNING', count: 50, total: 120 }],
    } as unknown as FirebaseImport);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.label('contentMigration')).toBe('Content migration');
    expect(component.countText(component.run().stages[0])).toBe('50 / 120');
  });
});

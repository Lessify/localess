import { TestBed } from '@angular/core/testing';
import { FirebaseImportStepsComponent } from './firebase-import-steps.component';

describe('FirebaseImportStepsComponent', () => {
  function render(current: number) {
    const fixture = TestBed.createComponent(FirebaseImportStepsComponent);
    fixture.componentRef.setInput('current', current);
    fixture.detectChanges();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
  }

  it('marks the current step, checks the steps before it, numbers the ones after', () => {
    const steps = render(2);
    expect(steps.map(it => it.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Connect', '2 Choose space', '3 Import']);
    expect(steps.map(it => it.getAttribute('aria-current'))).toEqual([null, 'step', null]);
    expect(steps[0].querySelector('ng-icon')?.getAttribute('name')).toBe('lucideCheck');
  });
});

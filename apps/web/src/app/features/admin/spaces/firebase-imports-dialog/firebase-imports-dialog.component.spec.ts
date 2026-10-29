import { TestBed } from '@angular/core/testing';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { Router } from '@angular/router';
import { FirebaseImport } from '@localess/shared';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { EMPTY, of } from 'rxjs';
import { vi } from 'vitest';

import { FirebaseImportsDialogComponent } from './firebase-imports-dialog.component';

describe('FirebaseImportsDialogComponent', () => {
  const runs = [
    { id: 'r2', sourceSpaceName: 'B', status: 'FAILED', stages: [] },
    { id: 'r1', sourceSpaceName: 'A', status: 'FINISHED', stages: [] },
  ] as unknown as FirebaseImport[];

  function setup(cancel = vi.fn(), list: FirebaseImport[] = runs, poll = vi.fn().mockReturnValue(EMPTY)) {
    TestBed.overrideComponent(FirebaseImportsDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseImportService, useValue: { findAll: vi.fn().mockReturnValue(of(list)), cancel, poll } },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(FirebaseImportsDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('lists the runs, newest first as the API returns them, and opens one', () => {
    const component = setup();
    expect(component.runs().map(it => it.id)).toEqual(['r2', 'r1']);
    expect(component.selectedRun()).toBeUndefined();
    component.select(runs[1]);
    expect(component.selectedRun()?.id).toBe('r1');
  });

  it('words each status', () => {
    const component = setup();
    expect(['RUNNING', 'FINISHED', 'FAILED'].map(status => component.statusLabel({ status } as FirebaseImport))).toEqual([
      'Importing',
      'Imported',
      'Failed',
    ]);
  });

  it('follows a running run while the list is open, in the list and in the open view', () => {
    const running = { id: 'r3', sourceSpaceName: 'C', status: 'RUNNING', stages: [] } as unknown as FirebaseImport;
    const ended = { ...running, status: 'FINISHED' } as FirebaseImport;
    const poll = vi.fn().mockReturnValue(of(ended));
    const component = setup(vi.fn(), [running, ...runs], poll);
    expect(poll).toHaveBeenCalledExactlyOnceWith('r3');
    expect(component.runs()[0]).toBe(ended);
  });

  it('opens the space of a finished run, closing the dialog', () => {
    const component = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.openSpace({ ...runs[1], spaceId: 's1' });
    expect(TestBed.inject(BrnDialogRef).close).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/features', 'spaces', 's1', 'dashboard']);
  });

  it('cancels a running run, in the list and in the open view', () => {
    const cancelled = { id: 'r2', sourceSpaceName: 'B', status: 'FAILED', stages: [] } as unknown as FirebaseImport;
    const cancel = vi.fn().mockReturnValue(of(cancelled));
    const component = setup(cancel);
    component.select({ ...runs[0], status: 'RUNNING' });
    component.cancel(component.selectedRun()!);
    expect(cancel).toHaveBeenCalledWith('r2');
    expect(component.selectedRun()).toBe(cancelled);
    expect(component.runs()[0]).toBe(cancelled);
  });

  describe('with its template', () => {
    const isBoundedScroll = (el: Element | null) =>
      !!el && el.classList.contains('overflow-y-auto') && [...el.classList].some(it => it.startsWith('max-h-'));

    function render(list: FirebaseImport[]) {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: FirebaseImportService,
            useValue: { findAll: vi.fn().mockReturnValue(of(list)), cancel: vi.fn(), poll: vi.fn().mockReturnValue(EMPTY) },
          },
          { provide: BrnDialogRef, useValue: { close: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(FirebaseImportsDialogComponent);
      fixture.detectChanges();
      return fixture;
    }

    it('scrolls a long list of runs inside the dialog', () => {
      const many = Array.from({ length: 40 }, (_, i) => ({ ...runs[1], id: `r${i}`, startedBy: { name: 'QA', email: 'qa@example.com' } }));
      const fixture = render(many as FirebaseImport[]);

      const list = (fixture.nativeElement as HTMLElement).querySelector('[hlmItemGroup]');
      expect(list?.querySelectorAll('[hlmItem]').length).toBe(40);
      expect(isBoundedScroll(list)).toBe(true);
    });

    it('shows each run with its status, warnings, where from, who and how long, and the action that fits', () => {
      const listed = [
        {
          id: 'r1',
          sourceSpaceName: 'TrueSeducer',
          status: 'FINISHED',
          spaceId: 's1',
          origin: 'https://localess-prod.web.app',
          startedBy: { name: 'QA', email: 'qa@example.com' },
          startedAt: '2026-10-26T10:04:00.000Z',
          finishedAt: '2026-10-26T10:04:46.000Z',
          stages: [{ stage: 'schemas', status: 'DONE', count: 21, warningCount: 2 }],
        },
        {
          id: 'r2',
          sourceSpaceName: 'Localess.ORG',
          status: 'FAILED',
          spaceId: 's2',
          origin: 'https://localess-prod.web.app',
          startedBy: { name: 'QA', email: 'qa@example.com' },
          startedAt: '2026-10-26T10:03:00.000Z',
          finishedAt: '2026-10-26T10:03:31.000Z',
          stages: [],
        },
      ] as unknown as FirebaseImport[];
      const fixture = render(listed);
      const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[hlmItem]')];
      const text = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      expect(text(items[0])).toContain('TrueSeducer');
      expect(text(items[0])).toContain('Imported');
      expect(text(items[0])).toContain('2 warnings');
      expect(text(items[0])).toContain('localess-prod.web.app · qa@example.com');
      expect(text(items[0])).toContain('· took 46 s');
      expect(text(items[0])).toContain('Open space');
      expect(text(items[1])).toContain('Failed');
      expect(text(items[1])).not.toContain('Open space');
    });

    it("scrolls an opened run's stage progress inside the dialog", () => {
      const listed = runs.map(it => ({ ...it, origin: 'https://cms.example.com', startedBy: { name: 'QA', email: 'qa@example.com' } }));
      const fixture = render(listed);
      fixture.componentInstance.select(listed[1]);
      fixture.detectChanges();

      expect(isBoundedScroll((fixture.nativeElement as HTMLElement).querySelector('ll-firebase-import-progress'))).toBe(true);
    });
  });
});

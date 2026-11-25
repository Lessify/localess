import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActiveTasksSummary, TaskNotifierService } from '@core/services/task-notifier.service';
import { DocumentTitleService } from '@core/title/document-title.service';
import { vi } from 'vitest';

import { TAB_ICON_FRAME_MS, TAB_ICON_SWAPPED, TabActivityService } from './tab-activity.service';

describe('TabActivityService', () => {
  const active = signal<ActiveTasksSummary | undefined>(undefined);
  const setActivity = vi.fn();
  let icon: HTMLLinkElement;
  let touchIcon: HTMLLinkElement;

  function start() {
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskNotifierService, useValue: { active } },
        { provide: DocumentTitleService, useValue: { setActivity } },
      ],
    });
    TestBed.inject(TabActivityService).start();
    TestBed.tick();
  }

  function set(value: ActiveTasksSummary | undefined) {
    active.set(value);
    TestBed.tick();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    active.set(undefined);
    icon = Object.assign(document.createElement('link'), { rel: 'icon', href: '/favicon-32x32.png' });
    touchIcon = Object.assign(document.createElement('link'), { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
    document.head.append(icon, touchIcon);
  });

  afterEach(() => {
    icon.remove();
    touchIcon.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('leaves the tab alone while no task runs', () => {
    start();

    vi.advanceTimersByTime(TAB_ICON_FRAME_MS * 3);

    expect(setActivity).toHaveBeenLastCalledWith(undefined);
    expect(icon.href).toContain('/favicon-32x32.png');
  });

  it('swaps the tab icon while a task runs, and puts it back when it ends', () => {
    start();
    set({ count: 1, label: 'Translation Export' });

    vi.advanceTimersByTime(TAB_ICON_FRAME_MS);
    expect(icon.href).toContain(TAB_ICON_SWAPPED);
    expect(touchIcon.href).toContain('/apple-touch-icon.png');
    vi.advanceTimersByTime(TAB_ICON_FRAME_MS);
    expect(icon.href).toContain('/favicon-32x32.png');
    vi.advanceTimersByTime(TAB_ICON_FRAME_MS);

    set(undefined);
    expect(icon.href).toContain('/favicon-32x32.png');
    vi.advanceTimersByTime(TAB_ICON_FRAME_MS * 3);
    expect(icon.href).toContain('/favicon-32x32.png');
  });

  it('leads the title with the task and its progress', () => {
    start();

    set({ count: 1, label: 'Translation Export' });
    expect(setActivity).toHaveBeenLastCalledWith('Translation Export…');

    set({ count: 1, label: 'Translation Export', percent: 42 });
    expect(setActivity).toHaveBeenLastCalledWith('42% Translation Export');

    set({ count: 3, label: 'Translation Export', percent: 42 });
    expect(setActivity).toHaveBeenLastCalledWith('3 tasks…');

    set(undefined);
    expect(setActivity).toHaveBeenLastCalledWith(undefined);
  });
});

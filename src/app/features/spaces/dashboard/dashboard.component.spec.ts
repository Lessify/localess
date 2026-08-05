import { Timestamp } from '@angular/fire/firestore';
import { TestBed } from '@angular/core/testing';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DashboardComponent } from './dashboard.component';

function space(overview?: Space['overview']): Space {
  return {
    id: 'space-1',
    name: 'Space 1',
    locales: [],
    localeFallback: { id: 'en', name: 'English' } as Space['localeFallback'],
    overview,
    createdAt: 0 as unknown as Space['createdAt'],
    updatedAt: 0 as unknown as Space['updatedAt'],
  };
}

describe('DashboardComponent', () => {
  function setup(selectedSpace: Space | undefined) {
    const calculateOverview = vi.fn().mockReturnValue(of(undefined));
    const success = vi.fn();
    const error = vi.fn();
    TestBed.overrideComponent(DashboardComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: SpaceStore, useValue: { selectedSpace: signal(selectedSpace) } },
        { provide: SpaceService, useValue: { calculateOverview } },
        { provide: NotificationService, useValue: { success, error } },
      ],
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, calculateOverview, success, error };
  }

  it('recalculates automatically when the selected space has no overview yet', () => {
    const { calculateOverview } = setup(space(undefined));

    expect(calculateOverview).toHaveBeenCalledWith('space-1');
  });

  it('recalculates automatically when the overview is more than a day stale', () => {
    const staleTimestamp = { seconds: Timestamp.now().seconds - 90000, nanoseconds: 0 } as unknown as Timestamp;
    const { calculateOverview } = setup(
      space({ updatedAt: staleTimestamp } as unknown as Space['overview']),
    );

    expect(calculateOverview).toHaveBeenCalledWith('space-1');
  });

  it('does not recalculate automatically when the overview is fresh', () => {
    const freshTimestamp = Timestamp.now();
    const { calculateOverview } = setup(
      space({ updatedAt: freshTimestamp } as unknown as Space['overview']),
    );

    expect(calculateOverview).not.toHaveBeenCalled();
  });

  it('calculateOverview() notifies success', () => {
    const freshTimestamp = Timestamp.now();
    const { component, calculateOverview, success } = setup(
      space({ updatedAt: freshTimestamp } as unknown as Space['overview']),
    );
    calculateOverview.mockClear();

    component.calculateOverview();

    expect(calculateOverview).toHaveBeenCalledWith('space-1');
    expect(success).toHaveBeenCalledWith('Space overview is recalculated.');
  });

  it('calculateOverview() notifies an error on failure', () => {
    const freshTimestamp = Timestamp.now();
    const { component, calculateOverview, error } = setup(
      space({ updatedAt: freshTimestamp } as unknown as Space['overview']),
    );
    calculateOverview.mockReturnValue(throwError(() => new Error('boom')));

    component.calculateOverview();

    expect(error).toHaveBeenCalledWith('Space overview can not be recalculated.');
  });
});

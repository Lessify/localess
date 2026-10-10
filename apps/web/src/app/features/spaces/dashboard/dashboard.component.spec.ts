import { TestBed } from '@angular/core/testing';
import { SpaceService } from '@core/services/space.service';
import { SpaceOverview } from '@localess/shared';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { DashboardComponent } from './dashboard.component';

const overview: SpaceOverview = {
  counts: { locales: 2, translations: 4, assets: 3, contents: 1, schemas: 2 },
  storage: { assets: 2048, assetsWithoutSize: 1 },
  progress: {
    total: 4,
    locales: [
      { id: 'en', name: 'English', translated: 4 },
      { id: 'de', name: 'German', translated: 1 },
    ],
  },
};

describe('DashboardComponent', () => {
  function setup(template?: string) {
    const responses = new Subject<SpaceOverview>();
    const overviewOf = vi.fn().mockReturnValue(responses);
    if (template !== undefined) TestBed.overrideComponent(DashboardComponent, { set: { template } });
    TestBed.configureTestingModule({ providers: [{ provide: SpaceService, useValue: { overview: overviewOf } }] });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, responses, overviewOf };
  }

  it('asks the server for the overview of the space, loading until it answers', () => {
    const { component, responses, overviewOf } = setup('<div></div>');

    expect(overviewOf).toHaveBeenCalledWith('space-1');
    expect(component.isLoading()).toBe(true);

    responses.next(overview);
    expect(component.isLoading()).toBe(false);
    expect(component.overview()).toEqual(overview);
  });

  it('follows live updates of the overview', () => {
    const { component, responses } = setup('<div></div>');
    responses.next(overview);

    responses.next({ ...overview, counts: { ...overview.counts, assets: 4 } });

    expect(component.overview()?.counts.assets).toBe(4);
  });

  it('reports an overview that can not be loaded', () => {
    const { component, responses } = setup('<div></div>');

    responses.error(new Error('boom'));

    expect(component.isError()).toBe(true);
    expect(component.overview()).toBeUndefined();
  });

  it('ratio() is 0 without keys, the share otherwise', () => {
    const { component } = setup('<div></div>');

    expect(component.ratio(0, 0)).toBe(0);
    expect(component.ratio(1, 4)).toBe(0.25);
  });

  it('renders the counters, asset storage with the files of unknown size, and progress per locale', () => {
    const { fixture, responses } = setup();
    responses.next(overview);
    fixture.detectChanges();

    // Whitespace removed: adjacent elements render without any between them.
    const text = (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, '');
    expect(text).toContain('TranslationKeys4');
    expect(text).toContain('AssetFiles3');
    expect(text).toContain('1filehasnorecordedsizeandisnotcounted.');
    expect(text).toContain('English100%-4of4');
    expect(text).toContain('German25%-1of4');
    expect(text).not.toContain('Tasks');
  });
});

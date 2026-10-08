import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { AppSettings } from '@shared/models/settings.model';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SettingsService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('find() reads the settings', async () => {
    const service = setup();
    const result = firstValueFrom(service.find());
    http.expectOne({ method: 'GET', url: '/api/app/settings' }).flush({ ui: { text: 'Staging' } });
    expect(await result).toEqual({ ui: { text: 'Staging' } });
  });

  it('find() refetches when the settings change', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: AppSettings[] = [];
    const subscription = service.find().subscribe(it => results.push(it));
    http.expectOne('/api/app/settings').flush({});

    events.next({ spaceId: null, entity: 'settings', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne('/api/app/settings').flush({ ui: { color: 'primary' } });
    expect(results).toEqual([{}, { ui: { color: 'primary' } }]);
    subscription.unsubscribe();
  });

  it('updateUi() patches the ui settings', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateUi({ text: 'Staging', color: 'destructive' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/settings/ui' });
    expect(request.request.body).toEqual({ text: 'Staging', color: 'destructive' });
    request.flush({});
    await done;
  });
});

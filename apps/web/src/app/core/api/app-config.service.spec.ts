import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PublicAppConfig } from '@localess/shared';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { AppConfigService, DEFAULT_APP_CONFIG } from './app-config.service';
import { ChangeEvent, ChangeEventsService } from './change-events.service';

describe('AppConfigService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChangeEventsService, useValue: { changes: vi.fn(() => events) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AppConfigService);
  }

  const withUnsplash = (unsplash: boolean): PublicAppConfig => ({ ...DEFAULT_APP_CONFIG, plugins: { unsplash } });

  afterEach(() => http.verify());

  it('reads the config again when an admin changes an integration, and only then', async () => {
    const service = setup();
    const loaded = service.load();
    http.expectOne('/api/config').flush(withUnsplash(false));
    await loaded;
    const subscription = service.watch();

    events.next({ spaceId: null, entity: 'users', op: 'updated' });
    http.expectNone('/api/config');

    events.next({ spaceId: null, entity: 'integrations', id: 'unsplash', op: 'updated' });
    http.expectOne('/api/config').flush(withUnsplash(true));
    await Promise.resolve();
    expect(service.config().plugins.unsplash).toBe(true);
    subscription.unsubscribe();
  });

  it('reads it again after the stream reconnects (events may have been missed)', () => {
    const service = setup();
    const subscription = service.watch();
    events.next({ spaceId: null, entity: '*', op: 'updated' });
    http.expectOne('/api/config').flush(DEFAULT_APP_CONFIG);
    subscription.unsubscribe();
  });
});

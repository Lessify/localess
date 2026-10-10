import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, toArray } from 'rxjs';
import { vi } from 'vitest';
import { FirebaseImportService } from './firebase-import.service';

const BASE = '/api/app/admin/firebase-import';

describe('FirebaseImportService', () => {
  let http: HttpTestingController;
  const setup = () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(FirebaseImportService);
  };

  it('lists source spaces and starts an import with origin and token in the body', async () => {
    const service = setup();
    const spaces = firstValueFrom(service.sourceSpaces('https://cms.example.com', 't'));
    const list = http.expectOne({ method: 'POST', url: `${BASE}/spaces` });
    expect(list.request.body).toEqual({ origin: 'https://cms.example.com', token: 't' });
    list.flush([]);
    expect(await spaces).toEqual([]);
    const started = firstValueFrom(service.start('https://cms.example.com', 't', 's1'));
    const start = http.expectOne({ method: 'POST', url: BASE });
    expect(start.request.body).toEqual({ origin: 'https://cms.example.com', token: 't', spaceId: 's1' });
    start.flush({ id: 'r1', status: 'RUNNING' });
    expect(await started).toMatchObject({ id: 'r1' });
  });

  it('polls every 2 s until the run is no longer RUNNING', async () => {
    vi.useFakeTimers();
    const service = setup();
    const values = firstValueFrom(service.poll('r1').pipe(toArray()));
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne(`${BASE}/r1`).flush({ id: 'r1', status: 'RUNNING' });
    await vi.advanceTimersByTimeAsync(2000);
    http.expectOne(`${BASE}/r1`).flush({ id: 'r1', status: 'FINISHED' });
    expect((await values).map(it => it.status)).toEqual(['RUNNING', 'FINISHED']);
    vi.useRealTimers();
  });
});

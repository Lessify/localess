import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Version } from '@shared/models/version.model';

import { VersionService } from './version.service';

describe('VersionService', () => {
  let httpMock: HttpTestingController;
  let service: VersionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(VersionService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches /assets/version.json with no-store caching and returns the parsed Version', () => {
    const version: Version = { version: '3.2.0', gitCommitSha: 'abc123', buildDate: '2026-08-03' };
    let result: Version | undefined;

    service.checkRemoteVersion().subscribe(v => (result = v));

    const req = httpMock.expectOne('/assets/version.json');
    expect(req.request.method).toBe('GET');
    req.flush(version);

    expect(result).toEqual(version);
  });
});

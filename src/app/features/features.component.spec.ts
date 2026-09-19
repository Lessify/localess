import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Release } from '@shared/generated/github/models/release';
import { ReposService } from '@shared/generated/github/services/repos.service';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { VersionService } from '@shared/services/version.service';
import { AppSettingsStore } from '@shared/stores/app-settings.store';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { UserStore } from '@shared/stores/user.store';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { of, EMPTY, Observable, throwError } from 'rxjs';
import { vi } from 'vitest';

import { environment } from '../../environments/environment';
import { FeaturesComponent } from './features.component';
import { WHATS_NEW } from './whats-new/whats-new.data';
import { WhatsNewDialogComponent } from './whats-new/whats-new-dialog.component';

function configureModule(overrides: {
  findAllDocuments: ReturnType<typeof vi.fn>;
  findAllSchemas: ReturnType<typeof vi.fn>;
  updateDocuments: ReturnType<typeof vi.fn>;
  updateSchemas: ReturnType<typeof vi.fn>;
  notifyError: ReturnType<typeof vi.fn>;
  /** What the user has already read in the What's New dialog; defaults to nothing seen yet. */
  lastSeenWhatsNewVersion?: string;
  /** Latest GitHub release; omit to simulate GitHub never answering. */
  latestRelease?: Partial<Release> | null;
  /** ISO build date served by version.json; omit to simulate it not having loaded. */
  buildDate?: string;
}) {
  TestBed.overrideComponent(FeaturesComponent, { set: { template: '<div></div>' } });
  TestBed.configureTestingModule({
    providers: [
      { provide: ContentService, useValue: { findAllDocuments: overrides.findAllDocuments } },
      { provide: SchemaService, useValue: { findAll: overrides.findAllSchemas } },
      { provide: NotificationService, useValue: { error: overrides.notifyError } },
      {
        provide: ReposService,
        useValue: {
          reposGetLatestRelease: vi
            .fn()
            .mockReturnValue(overrides.latestRelease === null ? EMPTY : of((overrides.latestRelease ?? {}) as Release)),
        },
      },
      {
        provide: VersionService,
        useValue: {
          checkRemoteVersion: vi.fn().mockReturnValue(
            overrides.buildDate
              ? of({ version: environment.version, gitCommitSha: 'test', buildDate: overrides.buildDate })
              : EMPTY,
          ),
        },
      },
      { provide: Auth, useValue: {} },
      { provide: Router, useValue: { events: of(), navigate: vi.fn() } },
      { provide: ActivatedRoute, useValue: { root: { snapshot: { data: {} }, children: [] } } },
      {
        provide: SpaceStore,
        useValue: {
          selectedSpaceId: signal('space-1'),
          updateDocuments: overrides.updateDocuments,
          updateSchemas: overrides.updateSchemas,
        },
      },
      { provide: UserStore, useValue: { isAuthenticated: signal(true) } },
      { provide: AppSettingsStore, useValue: {} },
      {
        provide: LocalSettingsStore,
        useValue: {
          settings: signal({}),
          lastSeenWhatsNewVersion: signal(overrides.lastSeenWhatsNewVersion ?? ''),
          setLastSeenWhatsNewVersion: vi.fn(),
        },
      },
    ],
  });
  return TestBed.createComponent(FeaturesComponent);
}

describe('FeaturesComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('notifies the user and recovers documents after the listener errors once', async () => {
    vi.useFakeTimers();
    let call = 0;
    const findAllDocuments = vi.fn().mockImplementation((): Observable<unknown> => {
      call++;
      return call === 1 ? throwError(() => new Error('boom')) : of([{ id: 'doc1' }]);
    });
    const updateDocuments = vi.fn();
    const notifyError = vi.fn();

    const fixture = configureModule({
      findAllDocuments,
      findAllSchemas: vi.fn().mockReturnValue(of([])),
      updateDocuments,
      updateSchemas: vi.fn(),
      notifyError,
    });
    fixture.detectChanges();

    expect(notifyError).toHaveBeenCalledWith('Lost connection to content updates. Retrying…');
    expect(updateDocuments).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(updateDocuments).toHaveBeenCalledWith([{ id: 'doc1' }]);
    expect(findAllDocuments).toHaveBeenCalledTimes(2);
  });

  it('notifies the user and recovers schemas after the listener errors once', async () => {
    vi.useFakeTimers();
    let call = 0;
    const findAllSchemas = vi.fn().mockImplementation((): Observable<unknown> => {
      call++;
      return call === 1 ? throwError(() => new Error('boom')) : of([{ id: 'schema1' }]);
    });
    const updateSchemas = vi.fn();
    const notifyError = vi.fn();

    const fixture = configureModule({
      findAllDocuments: vi.fn().mockReturnValue(of([])),
      findAllSchemas,
      updateDocuments: vi.fn(),
      updateSchemas,
      notifyError,
    });
    fixture.detectChanges();

    expect(notifyError).toHaveBeenCalledWith('Lost connection to schema updates. Retrying…');
    expect(updateSchemas).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(updateSchemas).toHaveBeenCalledWith([{ id: 'schema1' }]);
    expect(findAllSchemas).toHaveBeenCalledTimes(2);
  });

  it('does not notify or retry when the listeners succeed on the first try', () => {
    const findAllDocuments = vi.fn().mockReturnValue(of([{ id: 'doc1' }]));
    const updateDocuments = vi.fn();
    const notifyError = vi.fn();

    const fixture = configureModule({
      findAllDocuments,
      findAllSchemas: vi.fn().mockReturnValue(of([])),
      updateDocuments,
      updateSchemas: vi.fn(),
      notifyError,
    });
    fixture.detectChanges();

    expect(notifyError).not.toHaveBeenCalled();
    expect(updateDocuments).toHaveBeenCalledWith([{ id: 'doc1' }]);
    expect(findAllDocuments).toHaveBeenCalledTimes(1);
  });

  it('opens the What\'s New dialog', () => {
    const fixture = configureModule({
      findAllDocuments: vi.fn().mockReturnValue(of([])),
      findAllSchemas: vi.fn().mockReturnValue(of([])),
      updateDocuments: vi.fn(),
      updateSchemas: vi.fn(),
      notifyError: vi.fn(),
    });
    fixture.detectChanges();
    const open = vi.spyOn(TestBed.inject(HlmDialogService), 'open').mockReturnValue({ closed$: of(undefined) } as never);

    fixture.componentInstance.openWhatsNew();

    expect(open).toHaveBeenCalledWith(WhatsNewDialogComponent, expect.objectContaining({ contentClass: expect.any(String) }));
  });

  const whatsNewDefaults = {
    findAllDocuments: vi.fn().mockReturnValue(of([])),
    findAllSchemas: vi.fn().mockReturnValue(of([])),
    updateDocuments: vi.fn(),
    updateSchemas: vi.fn(),
    notifyError: vi.fn(),
  };

  it('flags unseen release notes when the user has read nothing', () => {
    const fixture = configureModule({ ...whatsNewDefaults });
    fixture.detectChanges();

    expect(fixture.componentInstance.hasUnseenWhatsNew()).toBe(true);
  });

  it('does not flag release notes the user has already opened', () => {
    const fixture = configureModule({ ...whatsNewDefaults, lastSeenWhatsNewVersion: WHATS_NEW[0].version });
    fixture.detectChanges();

    expect(fixture.componentInstance.hasUnseenWhatsNew()).toBe(false);
  });

  /** An older stored version means the build shipped notes since, so the dot comes back. */
  it('flags release notes newer than the one last opened', () => {
    const fixture = configureModule({ ...whatsNewDefaults, lastSeenWhatsNewVersion: '3.0.0' });
    fixture.detectChanges();

    expect(fixture.componentInstance.hasUnseenWhatsNew()).toBe(true);
  });

  it('records the shipped notes version when the dialog is opened', () => {
    const fixture = configureModule({ ...whatsNewDefaults });
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(HlmDialogService), 'open').mockReturnValue({ closed$: of(undefined) } as never);
    const store = TestBed.inject(LocalSettingsStore);

    fixture.componentInstance.openWhatsNew();

    expect(store.setLastSeenWhatsNewVersion).toHaveBeenCalledWith(WHATS_NEW[0].version);
  });

  /** The row always states the running version, so a silent GitHub must not read as "up to date... or gone". */
  it('reports no new version when GitHub never answers', () => {
    const fixture = configureModule({ ...whatsNewDefaults, latestRelease: null });
    fixture.detectChanges();

    expect(fixture.componentInstance.latestRelease()).toBeUndefined();
    expect(fixture.componentInstance.hasNewVersion()).toBe(false);
  });

  it('reports no new version when GitHub answers without a tag', () => {
    const fixture = configureModule({ ...whatsNewDefaults, latestRelease: {} });
    fixture.detectChanges();

    expect(fixture.componentInstance.hasNewVersion()).toBe(false);
  });

  it('reports a new version when the GitHub tag is ahead of this build', () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      latestRelease: { tag_name: 'v4.1.0', html_url: 'https://github.com/Lessify/localess/releases/tag/v4.1.0' },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.hasNewVersion()).toBe(true);
  });

  /** The tag carries a leading `v`, `environment.version` does not - the two must still match. */
  it('reports no new version when the GitHub tag matches this build', () => {
    const fixture = configureModule({ ...whatsNewDefaults, latestRelease: { tag_name: 'v' + environment.version } });
    fixture.detectChanges();

    expect(fixture.componentInstance.hasNewVersion()).toBe(false);
  });

  it('reports no new version when the GitHub tag is behind this build', () => {
    const fixture = configureModule({ ...whatsNewDefaults, latestRelease: { tag_name: 'v3.2.0' } });
    fixture.detectChanges();

    expect(fixture.componentInstance.hasNewVersion()).toBe(false);
  });

  /** `timer(0, …)` emits on a macrotask, so the build date lands just after the first render. */
  async function settleVersionCheck(fixture: ReturnType<typeof configureModule>) {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  it('counts whole days between the build and the newer release', async () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      buildDate: '2026-06-01T00:00:00.000Z',
      latestRelease: { tag_name: 'v4.1.0', published_at: '2026-07-18T00:00:00.000Z' },
    });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.daysBehind()).toBe(47);
    expect(fixture.componentInstance.versionTooltip()).toContain('released 47 days after your build');
  });

  it('says day rather than days for a single day', async () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      buildDate: '2026-06-01T00:00:00.000Z',
      latestRelease: { tag_name: 'v4.1.0', published_at: '2026-06-02T00:00:00.000Z' },
    });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.daysBehind()).toBe(1);
    expect(fixture.componentInstance.versionTooltip()).toContain('released 1 day after your build');
  });

  /** A build made after the release still shows the update, just without a day count. */
  it('reports no gap when the build is newer than the release', async () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      buildDate: '2026-08-01T00:00:00.000Z',
      latestRelease: { tag_name: 'v4.1.0', published_at: '2026-07-18T00:00:00.000Z' },
    });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.hasNewVersion()).toBe(true);
    expect(fixture.componentInstance.daysBehind()).toBe(0);
  });

  it('reports no gap before the build date has loaded', async () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      latestRelease: { tag_name: 'v4.1.0', published_at: '2026-07-18T00:00:00.000Z' },
    });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.daysBehind()).toBe(0);
  });

  it('reports no gap when already on the latest version', async () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      buildDate: '2026-06-01T00:00:00.000Z',
      latestRelease: { tag_name: 'v3.2.0', published_at: '2026-01-01T00:00:00.000Z' },
    });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.daysBehind()).toBe(0);
    expect(fixture.componentInstance.versionTooltip()).toContain('You are on the latest version.');
  });

  /** An unparsable published_at must not surface as NaN in the sidebar. */
  it('reports no gap when a date cannot be parsed', async () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      buildDate: '2026-06-01T00:00:00.000Z',
      latestRelease: { tag_name: 'v4.1.0', published_at: 'not-a-date' },
    });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.daysBehind()).toBe(0);
  });

  /** How old the install is only matters next to an upgrade prompt, so that is where the date rides. */
  it('names the build date in the tooltip when an update is available', async () => {
    const fixture = configureModule({
      ...whatsNewDefaults,
      buildDate: '2026-06-01T00:00:00.000Z',
      latestRelease: { tag_name: 'v4.1.0', published_at: '2026-07-18T00:00:00.000Z' },
    });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.versionTooltip()).toContain('This build is from');
  });

  /** Nothing to act on when current, so the tooltip stays a single sentence. */
  it('keeps the up-to-date tooltip free of build details', async () => {
    const fixture = configureModule({ ...whatsNewDefaults, buildDate: '2026-06-01T00:00:00.000Z' });
    await settleVersionCheck(fixture);

    expect(fixture.componentInstance.versionTooltip()).toBe('You are on the latest version.');
  });
});

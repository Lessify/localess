import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { PageTitleStrategy } from './page-title.strategy';

describe('PageTitleStrategy', () => {
  function setup() {
    const setTitle = vi.fn();
    TestBed.configureTestingModule({ providers: [PageTitleStrategy, { provide: Title, useValue: { setTitle } }] });
    return { strategy: TestBed.inject(PageTitleStrategy), setTitle };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes a resolved route title with the app name', () => {
    const { strategy, setTitle } = setup();
    vi.spyOn(TitleStrategy.prototype, 'buildTitle').mockReturnValue('Dashboard');

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(setTitle).toHaveBeenCalledWith(`${environment.appName} - Dashboard`);
  });

  it('falls back to the bare app name when no route title is set', () => {
    const { strategy, setTitle } = setup();
    vi.spyOn(TitleStrategy.prototype, 'buildTitle').mockReturnValue(undefined);

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(setTitle).toHaveBeenCalledWith(environment.appName);
  });
});

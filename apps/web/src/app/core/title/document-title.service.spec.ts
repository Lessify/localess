import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { vi } from 'vitest';

import { DocumentTitleService } from './document-title.service';

describe('DocumentTitleService', () => {
  function setup() {
    const setTitle = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: Title, useValue: { setTitle } }] });
    return { service: TestBed.inject(DocumentTitleService), setTitle };
  }

  it("leads the page's title with the activity while one runs", () => {
    const { service, setTitle } = setup();

    service.setPage('Localess - Tasks');
    expect(setTitle).toHaveBeenLastCalledWith('Localess - Tasks');

    service.setActivity('42% Translation Export');
    expect(setTitle).toHaveBeenLastCalledWith('42% Translation Export · Localess - Tasks');

    service.setPage('Localess - Translations');
    expect(setTitle).toHaveBeenLastCalledWith('42% Translation Export · Localess - Translations');

    service.setActivity(undefined);
    expect(setTitle).toHaveBeenLastCalledWith('Localess - Translations');
  });
});
